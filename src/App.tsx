import { useEffect, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { Bell, Compass, Heart, Home, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings, UserRound, LogOut, ImagePlus, Video, Pencil, X, Users } from "lucide-react";

type Profile = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null };
type Post = { id: string; user_id: string; author: string; handle: string; avatar: string; avatarUrl?: string; time: string; text: string; media?: string[]; likes: number };
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return; setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
        if (error) throw error; setMessage(data.session ? "تم إنشاء حسابك بنجاح." : "تم إنشاء الحساب. افحص بريدك لتأكيده ثم سجّل الدخول.");
      } else { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; }
    } catch (err) { setMessage(err instanceof Error ? err.message : "تعذر إكمال العملية."); } finally { setBusy(false); }
  }
  return <main className="auth-wrap" dir="rtl"><form className="auth-card" onSubmit={submit}><div className="brand auth-brand"><span className="brand-mark">M</span><span>MOMENT</span></div><h1>{mode === "signup" ? "ابدأ لحظتك" : "مرحباً بعودتك"}</h1><p>كل لحظة تستحق أن تُشارك.</p>
    {mode === "signup" && <label>الاسم الظاهر<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={50} placeholder="اسمك"/></label>}
    <label>البريد الإلكتروني<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
    <label>كلمة المرور<input required type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/></label>
    <button className="auth-submit" disabled={busy}>{busy?"جارٍ التنفيذ…":mode==="signup"?"إنشاء حساب":"تسجيل الدخول"}</button>
    {message && <div className="auth-message" role="status">{message}</div>}
    <button type="button" className="auth-switch" onClick={()=>{setMode(mode==="signup"?"login":"signup");setMessage("");}}>{mode==="signup"?"لديك حساب؟ سجّل الدخول":"ليس لديك حساب؟ أنشئ حساباً"}</button><small>لن نعرض منشورات تجريبية. ما تراه هنا يأتي من قاعدة البيانات.</small>
  </form></main>;
}

export default function App() {
  const [session,setSession]=useState<Session|null>(null); const [authReady,setAuthReady]=useState(false);
  const [posts,setPosts]=useState<Post[]>([]); const [draft,setDraft]=useState(""); const [notice,setNotice]=useState("");
  const [likes,setLikes]=useState<string[]>([]); const [busy,setBusy]=useState(false); const [page,setPage]=useState<"feed"|"profile">("feed");
  const [profile,setProfile]=useState<Profile|null>(null); const [editProfile,setEditProfile]=useState(false);
  const [name,setName]=useState(""); const [username,setUsername]=useState(""); const [bio,setBio]=useState("");
  const [mediaFile,setMediaFile]=useState<File|null>(null); const [avatarFile,setAvatarFile]=useState<File|null>(null);
  const [followers,setFollowers]=useState(0); const [following,setFollowing]=useState(0);

  useEffect(()=>{ if(!supabase){setAuthReady(true);return;} supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next)); return ()=>subscription.unsubscribe(); },[]);
  async function loadProfile() {
    if(!supabase||!session)return;
    const {data,error}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url").eq("id",session.user.id).maybeSingle();
    if(error){setNotice("تعذر تحميل الملف الشخصي: "+error.message);return;}
    if(data){setProfile(data as Profile);setName(data.display_name||"");setUsername(data.username||"");setBio(data.bio||"");}
    const [a,b]=await Promise.all([supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",session.user.id),supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",session.user.id)]);
    setFollowers(a.count||0);setFollowing(b.count||0);
  }
  async function loadPosts() {
    if(!supabase||!session)return;
    const {data,error}=await supabase.from("posts").select("id,caption,media_urls,created_at,user_id,profiles(username,display_name,avatar_url)").order("created_at",{ascending:false}).limit(40);
    if(error){setNotice("تعذر تحميل المنشورات: "+error.message);return;}
    const rows=data||[]; const ids=rows.map((p:any)=>p.id);
    const {data:likeRows,error:likeError}=ids.length?await supabase.from("likes").select("post_id,user_id").in("post_id",ids):{data:[],error:null};
    if(likeError)setNotice("تعذر تحميل بعض الإعجابات.");
    const all=likeRows||[];setLikes(all.filter((x:any)=>x.user_id===session.user.id).map((x:any)=>x.post_id));
    setPosts(rows.map((p:any)=>({id:p.id,user_id:p.user_id,author:p.profiles?.display_name||"عضو MOMENT",handle:"@"+(p.profiles?.username||"member"),avatar:(p.profiles?.display_name||"م")[0],avatarUrl:p.profiles?.avatar_url||undefined,time:new Date(p.created_at).toLocaleString("ar"),text:p.caption||"",media:p.media_urls||[],likes:all.filter((x:any)=>x.post_id===p.id).length})));
  }
  useEffect(()=>{if(session){void loadProfile();void loadPosts();}else{setPosts([]);setProfile(null);}},[session]);
  async function upload(file:File,folder:"posts"|"avatars") {
    if(!supabase||!session)throw new Error("يجب تسجيل الدخول أولاً.");
    const isVideo=file.type.startsWith("video/"); const isImage=file.type.startsWith("image/");
    if(!isVideo&&!isImage)throw new Error("اختر صورة أو فيديو فقط.");
    if(file.size>(isVideo?100:15)*1024*1024)throw new Error(isVideo?"الحد الأقصى للفيديو 100MB.":"الحد الأقصى للصورة 15MB.");
    const ext=file.name.split(".").pop()?.toLowerCase()|| (isVideo?"mp4":"jpg");
    const path=session.user.id+"/"+folder+"/"+crypto.randomUUID()+"."+ext;
    const {error}=await supabase.storage.from("moment-media").upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw error;
    return supabase.storage.from("moment-media").getPublicUrl(path).data.publicUrl;
  }
  async function publish() {
    if(!supabase||!session||(!draft.trim()&&!mediaFile))return;setBusy(true);setNotice("");
    try { const media=mediaFile?[await upload(mediaFile,"posts")]:[];
      const {error}=await supabase.from("posts").insert({user_id:session.user.id,caption:draft.trim(),media_urls:media});
      if(error)throw error;setDraft("");setMediaFile(null);const input=document.getElementById("post-media") as HTMLInputElement|null;if(input)input.value="";
      setNotice("تم نشر لحظتك وحفظها.");await loadPosts();
    } catch(err){setNotice("تعذر النشر: "+(err instanceof Error?err.message:"خطأ غير معروف"));} finally{setBusy(false);}
  }
  async function toggleLike(id:string) {
    if(!supabase||!session)return;const exists=likes.includes(id);
    const result=exists?await supabase.from("likes").delete().eq("post_id",id).eq("user_id",session.user.id):await supabase.from("likes").insert({post_id:id,user_id:session.user.id});
    if(result.error){setNotice("تعذر تحديث الإعجاب: "+result.error.message);return;}
    setLikes(v=>exists?v.filter(x=>x!==id):[...v,id]);setPosts(v=>v.map(p=>p.id===id?{...p,likes:Math.max(0,p.likes+(exists?-1:1))}:p));
  }
  async function saveProfile(e:React.FormEvent) {
    e.preventDefault();if(!supabase||!session)return;setBusy(true);setNotice("");
    try {let avatar=profile?.avatar_url||null;if(avatarFile)avatar=await upload(avatarFile,"avatars");
      const cleanUsername=username.trim().toLowerCase().replace(/^@/,"");
      if(cleanUsername&&!/^[a-z0-9_]{3,24}$/.test(cleanUsername))throw new Error("اسم المستخدم: 3 إلى 24 حرفاً إنجليزياً أو رقماً أو _.");
      const {error}=await supabase.from("profiles").update({display_name:name.trim(),username:cleanUsername||null,bio:bio.trim(),avatar_url:avatar}).eq("id",session.user.id);
      if(error)throw error;setAvatarFile(null);setEditProfile(false);await loadProfile();await loadPosts();setNotice("تم حفظ ملفك الشخصي.");
    } catch(err){setNotice("تعذر حفظ الملف: "+(err instanceof Error?err.message:"خطأ غير معروف"));}finally{setBusy(false);}
  }

  if(!supabase)return <main className="auth-wrap" dir="rtl"><section className="auth-card"><div className="brand auth-brand"><span className="brand-mark">M</span><span>MOMENT</span></div><h1>إعداد الاتصال مطلوب</h1><p>تأكد من متغيرَي بناء Cloudflare: VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY.</p></section></main>;
  if(!authReady)return <main className="auth-wrap">جارٍ التحقق من الجلسة…</main>;if(!session)return <AuthScreen/>;
  const email=session.user.email||"";
  const avatar=profile?.avatar_url;
  return <div className="app-shell" dir="rtl">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">M</span><span>MOMENT</span></div>
      <nav><a className={page==="feed"?"active":""} onClick={()=>setPage("feed")}><Home size={21}/> الرئيسية</a><a><Compass size={21}/> استكشف</a><a><MessageCircle size={21}/> الرسائل</a><a><Bell size={21}/> الإشعارات</a><a className={page==="profile"?"active":""} onClick={()=>setPage("profile")}><UserRound size={21}/> ملفي الشخصي</a></nav>
      <button className="new-post" onClick={()=>{setPage("feed");document.getElementById("post-box")?.focus();}}><Plus size={19}/> لحظة جديدة</button>
      <div className="sidebar-bottom"><span>{email}</span><button className="icon-button" onClick={()=>supabase.auth.signOut()} aria-label="تسجيل الخروج"><LogOut size={18}/></button></div>
    </aside>
    <main className="feed"><header className="topbar"><div><span className="mobile-brand">MOMENT</span><h1>{page==="feed"?"الرئيسية":"ملفي الشخصي"}</h1></div><button className="icon-button"><Search size={20}/></button></header>
      {notice&&<div className="notice" role="status">{notice}</div>}
      {page==="feed"?<>
        <section className="composer"><div className="composer-avatar">{avatar?<img src={avatar} alt=""/>:(profile?.display_name||"م")[0]}</div><div className="composer-main"><textarea id="post-box" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="بماذا تفكر؟ شارك لحظتك…" rows={3}/>
          {mediaFile&&<div className="selected-file">{mediaFile.name}<button onClick={()=>setMediaFile(null)}><X size={16}/></button></div>}
          <div className="composer-actions"><label className="media-pick" htmlFor="post-media"><ImagePlus size={17}/> صورة أو فيديو</label><input id="post-media" type="file" accept="image/*,video/*" hidden onChange={e=>setMediaFile(e.target.files?.[0]||null)}/><button onClick={publish} disabled={(!draft.trim()&&!mediaFile)||busy}><Send size={16}/>{busy?"جارٍ النشر…":"نشر"}</button></div></div></section>
        <div className="section-head posts-heading"><h2>آخر المنشورات</h2><span>{posts.length} منشور</span></div>
        {posts.length===0?<div className="empty-feed"><div className="empty-mark">M</div><h2>هنا تبدأ لحظاتك</h2><p>لا توجد منشورات بعد. كن أول من يشارك لحظته.</p></div>:posts.map(post=><article className="post" key={post.id}><div className="post-head"><div className="avatar">{post.avatarUrl?<img src={post.avatarUrl} alt=""/>:post.avatar}</div><div className="post-author"><b>{post.author}</b><small>{post.handle} · {post.time}</small></div><button className="icon-button"><MoreHorizontal size={20}/></button></div>
          {post.text&&<p>{post.text}</p>}{post.media?.map((url,i)=><div className="post-media" key={url}>{/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)?<video src={url} controls playsInline preload="metadata"/>:<img src={url} alt={"صورة المنشور "+(i+1)}/>}</div>)}
          <div className="post-actions"><button className={likes.includes(post.id)?"liked":""} onClick={()=>toggleLike(post.id)}><Heart size={19}/>{likes.includes(post.id)?"أعجبك":"إعجاب"} · {post.likes}</button><button><MessageCircle size={19}/> تعليق</button><button><Send size={18}/> مشاركة</button></div></article>)}
      </>:<section className="profile-page"><div className="profile-cover"></div><div className="profile-main"><div className="profile-avatar">{avatar?<img src={avatar} alt=""/>:(profile?.display_name||"م")[0]}</div><button className="edit-profile-btn" onClick={()=>setEditProfile(v=>!v)}><Pencil size={16}/> تعديل الملف</button>
        <h2>{profile?.display_name||"عضو MOMENT"}</h2><p className="profile-handle">@{profile?.username||"أضف_اسم_مستخدم"}</p><p className="profile-bio">{profile?.bio||"أضف نبذة قصيرة تعرّف الناس بك."}</p>
        <div className="profile-stats"><span><b>{posts.filter(p=>p.user_id===session.user.id).length}</b> منشور</span><span><b>{followers}</b> متابع</span><span><b>{following}</b> يتابع</span></div>
        {editProfile&&<form className="profile-edit" onSubmit={saveProfile}><label>الاسم الظاهر<input value={name} onChange={e=>setName(e.target.value)} maxLength={50}/></label><label>اسم المستخدم<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" dir="ltr"/></label><label>نبذة عنك<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={160}/></label><label className="media-pick" htmlFor="avatar-file"><ImagePlus size={17}/> تغيير الصورة الشخصية</label><input id="avatar-file" type="file" accept="image/*" hidden onChange={e=>setAvatarFile(e.target.files?.[0]||null)}/>{avatarFile&&<small>{avatarFile.name}</small>}<div className="edit-actions"><button type="button" onClick={()=>setEditProfile(false)}>إلغاء</button><button type="submit" disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ التغييرات"}</button></div></form>}
        <h3>منشوراتي</h3>{posts.filter(p=>p.user_id===session.user.id).length===0?<p>لم تنشر شيئاً بعد.</p>:posts.filter(p=>p.user_id===session.user.id).map(p=><div className="profile-post" key={p.id}>{p.text}{p.media?.[0]&&<img src={p.media[0]} alt=""/>}</div>)}
      </div></section>}
      <footer>© MOMENT — كل لحظة تستحق أن تُشارك</footer>
    </main>
    <aside className="right-panel"><div className="search-box"><Search size={18}/><input placeholder="ابحث في MOMENT"/></div><section className="panel-card"><h3>ذكريات مشتركة</h3><p>اجمع صورك ولحظاتك مع أصدقائك في مساحة واحدة.</p></section><section className="panel-card muted"><h3>حسابك</h3><p>{email}</p><button onClick={()=>setPage("profile")}>عرض الملف الشخصي</button></section></aside>
    <nav className="mobile-nav"><button onClick={()=>setPage("feed")}><Home/></button><button><Compass/></button><button onClick={()=>setPage("feed")}><Plus/></button><button><MessageCircle/></button><button onClick={()=>setPage("profile")}><UserRound/></button></nav>
  </div>;
}
