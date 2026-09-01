import { useParams, Link } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { Calendar, ArrowLeft, User } from "lucide-react";
import { useEffect } from "react";

function TagList({ tags }: { tags: unknown }) {
  let parsed: string[] = [];
  if (typeof tags === "string") {
    try { parsed = JSON.parse(tags); } catch { /* ignore */ }
  } else if (Array.isArray(tags)) {
    parsed = tags as string[];
  }
  if (parsed.length === 0) return null;
  return (
    <div className="mt-10 pt-6 border-t border-[#2A2A2A] flex flex-wrap gap-2">
      {parsed.map((tag: string) => (
        <span
          key={tag}
          className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-[0.06em] bg-[#1A1A1A] px-3 py-1.5"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post } = trpc.blog.getBySlug.useQuery({ slug: slug ?? "" });

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | DGF Corporations Blog`;
    }
  }, [post]);

  if (!post) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen">
        <SEO title="BlogPost | WEB-READY/AG" description="BlogPost page for WEB-READY/AG." />
      <Navigation />
        <div className="pt-32 pb-24 px-6 text-center">
          <h1 className="text-white text-2xl font-bold">Post not found</h1>
          <Link to="/blog" className="text-[#C8A45C] mt-4 inline-block">
            Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO title="BlogPost | WEB-READY/AG" description="BlogPost page for WEB-READY/AG." />
      <Navigation />
      <article className="pt-32 pb-24 px-6 lg:px-10">
        <div className="max-w-[800px] mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[#8A8A8A] text-[13px] hover:text-[#C8A45C] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> All Posts
          </Link>

          {post.category && (
            <span className="font-mono text-[11px] text-[#C8A45C] uppercase tracking-[0.1em]">
              {post.category}
            </span>
          )}

          <h1
            className="text-white font-black mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1 }}
          >
            {post.title}
          </h1>

          <div className="flex items-center gap-4 mt-4 text-[#8A8A8A] text-[13px]">
            {post.author && (
              <span className="flex items-center gap-1">
                <User size={12} /> {post.author}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {post.featuredImage && (
            <div className="mt-8 aspect-video overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div
            className="mt-8 text-[#C0C0C0] text-[17px] leading-[1.8] prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <TagList tags={post.tags} />
        </div>
      </article>
      <Footer />
    </div>
  );
}


