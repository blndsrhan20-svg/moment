import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Bell, Compass, Heart, Home, ImagePlus, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings, UserRound } from "lucide-react";

type Post = { id: string; author: string; handle: string; avatar: string; time: string; text: string; image?: string; likes: number };
const demoPosts: Post[] = [
  { id: "1", author: "MOMENT", handle: "@moment", avatar: "M", time: "الآن", text: "كل لحظة تستحق أن تُشارك. أهلاً بك في MOMENT — مساحة تجمع لحظاتك مع الأشخاص الأقرب إليك.", likes: 24 },
  { id: "2", author: "يوم جميل", handle: "@yourday", avatar: "ي", time: "منذ ساعة", text: "بعض اللحظات الصغيرة تصنع أجمل الذكريات.", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&auto=format&fit=crop", likes: 18 }
];
const stories = ["أنت", "سارة", "عمر", "نور", "محمد", "ليان"];
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function App() {
  const [posts, setPosts] = useState<Post[]>(demoPosts);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("مرحباً بك في MOMENT");
  const [likes, setLikes] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("posts").select("id,content,created_at,profiles(username,display_name,avatar_url)").order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setNotice("تعذر تحميل المنشورات من قاعدة البيانات حالياً."); return; }
        if (data?.length) setPosts(data.map((p: any) => ({ id: String(p.id), author: p.profiles?.display_name || "عضو MOMENT", handle: "@" + (p.profiles?.username || "member"), avatar: (p.profiles?.display_name || "م")[0], time: new Date(p.created_at).toLocaleDateString("ar"), text: p.content || "", likes: 0 })));
      });
    return () => { active = false; };
  }, []);
  async function publish() {
    const content = draft.trim();
    if (!content) return;
    if (supabase) {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { error } = await supabase.from("posts").insert({ user_id: auth.user.id, content });
        if (error) { setNotice("لم يتم نشر المنشور: " + error.message); return; }
      } else setNotice("تمت إضافة المنشور للعرض التجريبي. سجّل الدخول للنشر إلى حسابك.");
    }
    setPosts([{ id: String(Date.now()), author: "أنت", handle: "@you", avatar: "أ", time: "الآن", text: content, likes: 0 }, ...posts]);
    setDraft("");
  }
  return <div className="app-shell" dir="rtl">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>MOMENT</span></div>
      <nav>
        <a className="active"><Home size={21}/> الرئيسية</a><a><Compass size={21}/> استكشف</a><a><MessageCircle size={21}/> الرسائل</a><a><Bell size={21}/> الإشعارات</a><a><UserRound size={21}/> الملف الشخصي</a>
      </nav>
      <button className="new-post" onClick={() => document.getElementById("post-box")?.focus()}><Plus size={19}/> لحظة جديدة</button>
      <div className="sidebar-bottom"><Settings size={18}/> الإعدادات</div>
    </aside>
    <main className="feed">
      <header className="topbar"><div><span className="mobile-brand">MOMENT</span><h1>الرئيسية</h1></div><button className="icon-button"><Search size={20}/></button></header>
      <div className="notice">{notice}</div>
      <section className="stories"><div className="section-head"><h2>اللحظات</h2><span>عرض الكل</span></div><div className="story-row">{stories.map((s,i)=><button className="story" key={s}><span className={i===0?"story-ring own":"story-ring"}><span>{i===0?<Plus size={22}/>:s[0]}</span></span><small>{s}</small></button>)}</div></section>
      <section className="composer"><div className="composer-avatar">أ</div><div className="composer-main"><textarea id="post-box" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="بماذا تفكر؟ شارك لحظتك..." rows={2}/><div className="composer-actions"><span><ImagePlus size={18}/> صورة أو فيديو</span><button onClick={publish} disabled={!draft.trim()}><Send size={16}/> نشر</button></div></div></section>
      <div className="section-head posts-heading"><h2>آخر المنشورات</h2><MoreHorizontal size={20}/></div>
      {posts.map(post=><article className="post" key={post.id}><div className="post-head"><div className="avatar">{post.avatar}</div><div className="post-author"><b>{post.author}</b><small>{post.handle} · {post.time}</small></div><button className="icon-button"><MoreHorizontal size={20}/></button></div><p>{post.text}</p>{post.image&&<img className="post-image" src={post.image} alt="صورة المنشور"/>}<div className="post-actions"><button className={likes.includes(post.id)?"liked":""} onClick={()=>setLikes(v=>v.includes(post.id)?v.filter(x=>x!==post.id):[...v,post.id])}><Heart size={19}/>{post.likes+(likes.includes(post.id)?1:0)}</button><button><MessageCircle size={19}/> تعليق</button><button><Send size={18}/> مشاركة</button></div></article>)}
      <footer>© MOMENT — كل لحظة تستحق أن تُشارك</footer>
    </main>
    <aside className="right-panel"><div className="search-box"><Search size={18}/><input placeholder="ابحث في MOMENT"/></div><section className="panel-card"><h3>ذكريات مشتركة</h3><p>اجمع صورك ولحظاتك مع أصدقائك في مساحة واحدة.</p><button>اكتشف الفكرة</button></section><section className="panel-card muted"><h3>مساحتك الخاصة</h3><p>قريباً: مجموعات وقنوات ومحادثات خاصة.</p></section></aside>
    <nav className="mobile-nav"><Home/><Compass/><Plus/><MessageCircle/><UserRound/></nav>
  </div>;
}
