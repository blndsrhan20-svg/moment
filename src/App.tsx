import { useEffect, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { Bell, Compass, Heart, Home, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings, UserRound, LogOut } from "lucide-react";

type Post = { id: string; author: string; handle: string; avatar: string; time: string; text: string; image?: string; likes: number };
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
        if (error) throw error;
        setMessage(data.session ? "تم إنشاء حسابك بنجاح." : "تم إنشاء الحساب. افحص بريدك لتأكيده ثم سجّل الدخول.");
        if (data.session) return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : "تعذر إكمال العملية."); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap" dir="rtl"><form className="auth-card" onSubmit={submit}>
    <div className="brand auth-brand"><span className="brand-mark">M</span><span>MOMENT</span></div>
    <h1>{mode === "signup" ? "ابدأ لحظتك" : "مرحباً بعودتك"}</h1><p>كل لحظة تستحق أن تُشارك.</p>
    {mode === "signup" && <label>الاسم الظاهر<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={50} placeholder="اسمك"/></label>}
    <label>البريد الإلكتروني<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
    <label>كلمة المرور<input required type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/></label>
    <button className="auth-submit" disabled={busy}>{busy?"جارٍ التنفيذ…":mode==="signup"?"إنشاء حساب":"تسجيل الدخول"}</button>
    {message && <div className="auth-message" role="status">{message}</div>}
    <button type="button" className="auth-switch" onClick={()=>{setMode(mode==="signup"?"login":"signup");setMessage("");}}>{mode==="signup"?"لديك حساب؟ سجّل الدخول":"ليس لديك حساب؟ أنشئ حساباً"}</button>
    <small>لن نعرض منشورات تجريبية. ما تراه هنا يأتي من قاعدة البيانات.</small>
  </form></main>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>subscription.unsubscribe();
  }, []);

  async function loadPosts() {
    if (!supabase || !session) return;
    const {data,error}=await supabase.from("posts").select("id,caption,media_urls,created_at,user_id,profiles(username,display_name,avatar_url)").order("created_at",{ascending:false}).limit(30);
    if(error){setNotice("تعذر تحميل المنشورات: "+error.message);return;}
    const rows=data||[];
    const postIds=rows.map((p:any)=>p.id);
    const {data:likeRows,error:likeError}=postIds.length?await supabase.from("likes").select("post_id,user_id").in("post_id",postIds):{data:[],error:null};
    if(likeError)setNotice("تم تحميل المنشورات، لكن تعذر تحميل الإعجابات.");
    const allLikes=likeRows||[];
    setLikes(allLikes.filter((item:any)=>item.user_id===session.user.id).map((item:any)=>item.post_id));
    setPosts(rows.map((p:any)=>({id:p.id,author:p.profiles?.display_name||"عضو MOMENT",handle:"@"+(p.profiles?.username||"member"),avatar:(p.profiles?.display_name||"م")[0],time:new Date(p.created_at).toLocaleString("ar"),text:p.caption||"",image:p.media_urls?.[0],likes:allLikes.filter((item:any)=>item.post_id===p.id).length})));
  }
  useEffect(()=>{if(session) void loadPosts(); else setPosts([]);},[session]);

  async function publish() {
    const caption=draft.trim();
    if(!supabase||!session||!caption)return;
    setBusy(true);setNotice("");
    const {error}=await supabase.from("posts").insert({user_id:session.user.id,caption});
    if(error)setNotice("لم يُنشر المنشور: "+error.message);
    else {setDraft("");setNotice("تم نشر لحظتك وحفظها في قاعدة البيانات.");await loadPosts();}
    setBusy(false);
  }
  async function toggleLike(postId:string) {
    if(!supabase||!session)return;
    const exists=likes.includes(postId);
    const result=exists
      ? await supabase.from("likes").delete().eq("post_id",postId).eq("user_id",session.user.id)
      : await supabase.from("likes").insert({post_id:postId,user_id:session.user.id});
    if(result.error){setNotice("تعذر تحديث الإعجاب: "+result.error.message);return;}
    setLikes(v=>exists?v.filter(x=>x!==postId):[...v,postId]);
  }

  if(!supabase) return <main className="auth-wrap" dir="rtl"><section className="auth-card"><div className="brand auth-brand"><span className="brand-mark">M</span><span>MOMENT</span></div><h1>إعداد الاتصال مطلوب</h1><p>أضف متغيرَي البيئة في إعدادات بناء Cloudflare Pages:</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><p>استخدم رابط مشروع MOMENT ومفتاح Publishable فقط. لا تضع service_role أو secret key في الواجهة.</p></section></main>;
  if(!authReady)return <main className="auth-wrap">جارٍ التحقق من الجلسة…</main>;
  if(!session)return <AuthScreen/>;

  const email=session.user.email||"";
  return <div className="app-shell" dir="rtl">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">M</span><span>MOMENT</span></div>
      <nav><a className="active"><Home size={21}/> الرئيسية</a><a><Compass size={21}/> استكشف</a><a><MessageCircle size={21}/> الرسائل</a><a><Bell size={21}/> الإشعارات</a><a><UserRound size={21}/> الملف الشخصي</a></nav>
      <button className="new-post" onClick={()=>document.getElementById("post-box")?.focus()}><Plus size={19}/> لحظة جديدة</button>
      <div className="sidebar-bottom"><span>{email}</span><button className="icon-button" onClick={()=>supabase?.auth.signOut()} aria-label="تسجيل الخروج"><LogOut size={18}/></button><Settings size={18}/></div>
    </aside>
    <main className="feed"><header className="topbar"><div><span className="mobile-brand">MOMENT</span><h1>الرئيسية</h1></div><button className="icon-button"><Search size={20}/></button></header>
      {notice&&<div className="notice" role="status">{notice}</div>}
      <section className="composer"><div className="composer-avatar">{email[0]?.toUpperCase()||"م"}</div><div className="composer-main"><textarea id="post-box" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="بماذا تفكر؟ شارك لحظتك…" rows={3}/><div className="composer-actions"><span>النشر النصي متاح الآن</span><button onClick={publish} disabled={!draft.trim()||busy}><Send size={16}/>{busy?"جارٍ النشر…":"نشر"}</button></div></div></section>
      <div className="section-head posts-heading"><h2>آخر المنشورات</h2><MoreHorizontal size={20}/></div>
      {posts.length===0?<div className="empty-feed"><div className="empty-mark">M</div><h2>هنا تبدأ لحظاتك</h2><p>لا توجد منشورات بعد. كن أول من يشارك لحظته.</p></div>:posts.map(post=><article className="post" key={post.id}><div className="post-head"><div className="avatar">{post.avatar}</div><div className="post-author"><b>{post.author}</b><small>{post.handle} · {post.time}</small></div><button className="icon-button"><MoreHorizontal size={20}/></button></div><p>{post.text}</p>{post.image&&<img className="post-image" src={post.image} alt="صورة المنشور"/>}<div className="post-actions"><button className={likes.includes(post.id)?"liked":""} onClick={()=>toggleLike(post.id)}><Heart size={19}/>{likes.includes(post.id)?"أعجبك":"إعجاب"}</button><button><MessageCircle size={19}/> تعليق</button><button><Send size={18}/> مشاركة</button></div></article>)}
      <footer>© MOMENT — كل لحظة تستحق أن تُشارك</footer>
    </main>
    <aside className="right-panel"><div className="search-box"><Search size={18}/><input placeholder="ابحث في MOMENT"/></div><section className="panel-card"><h3>ذكريات مشتركة</h3><p>اجمع صورك ولحظاتك مع أصدقائك في مساحة واحدة.</p></section></aside>
    <nav className="mobile-nav"><Home/><Compass/><Plus/><MessageCircle/><UserRound/></nav>
  </div>;
}
