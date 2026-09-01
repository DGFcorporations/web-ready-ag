import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { Calendar, ArrowRight } from "lucide-react";

export default function Blog() {
  const { data } = trpc.blog.list.useQuery();

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO title="Blog | WEB-READY/AG" description="Blog page for WEB-READY/AG." />
      <Navigation />
      <section className="pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Insights
          </span>
          <h1
            className="text-white font-black mt-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.9 }}
          >
            AI Automation Blog
          </h1>
          <p className="text-[#8A8A8A] text-[18px] leading-relaxed mt-6 max-w-[600px]">
            Practical insights, case studies, and strategies for Florida service
            businesses looking to leverage AI automation.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data?.posts.map((post) => (
            <article
              key={post.id}
              className="group bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden hover:border-[#C8A45C]/30 transition-all duration-300"
            >
              {post.featuredImage && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  {post.category && (
                    <span className="font-mono text-[10px] text-[#C8A45C] uppercase tracking-[0.08em]">
                      {post.category}
                    </span>
                  )}
                  {post.publishedAt && (
                    <span className="flex items-center gap-1 text-[#8A8A8A] text-[11px] font-mono">
                      <Calendar size={10} />
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3 className="text-white text-[18px] font-bold leading-tight group-hover:text-[#C8A45C] transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-[#8A8A8A] text-[14px] leading-relaxed mt-2 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-[#C8A45C] font-mono text-[11px] uppercase tracking-[0.08em] mt-4 hover:text-[#D4BC7E] transition-colors"
                >
                  Read More <ArrowRight size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}


