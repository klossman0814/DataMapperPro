import { useEffect, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children)
    return extractText(children.props.children);
  return '';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function UserGuide() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/USER_GUIDE.md')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load guide (${res.status})`);
        return res.text();
      })
      .then(setContent)
      .catch(setError);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-500/10">
          <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Guide</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Complete documentation for DataMapper Pro
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {error ? (
          <div className="p-6 text-center text-red-500">
            <p>Failed to load the user guide.</p>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
          </div>
        ) : content === null ? (
          <div className="p-6 text-center text-gray-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="mt-3 text-sm">Loading guide...</p>
          </div>
        ) : (
          <div className="markdown-content scroll-smooth p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 id={slugify(extractText(children))} className="mb-4 mt-8 scroll-mt-20 text-2xl font-bold text-gray-900 first:mt-0 dark:text-white">{children}</h1>,
                h2: ({ children }) => <h2 id={slugify(extractText(children))} className="mb-3 mt-6 scroll-mt-20 text-xl font-semibold text-gray-900 dark:text-white">{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(extractText(children))} className="mb-2 mt-5 scroll-mt-20 text-lg font-medium text-gray-900 dark:text-white">{children}</h3>,
                h4: ({ children }) => <h4 id={slugify(extractText(children))} className="mb-2 mt-4 scroll-mt-20 text-base font-medium text-gray-900 dark:text-white">{children}</h4>,
                p: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700 last:mb-0 dark:text-slate-300">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 text-gray-700 dark:text-slate-300">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-gray-700 dark:text-slate-300">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700 dark:text-slate-300">{children}</li>,
                a: ({ href, children }) => <a href={href} className="text-primary-600 underline hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">{children}</a>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-normal text-gray-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>;
                  }
                  return <code className={className}>{children}</code>;
                },
                pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 dark:bg-slate-800">{children}</pre>,
                table: ({ children }) => <div className="mb-4 overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">{children}</table></div>,
                thead: ({ children }) => <thead className="bg-gray-50 dark:bg-slate-800">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-gray-200 dark:divide-slate-700">{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">{children}</th>,
                td: ({ children }) => <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700 dark:text-slate-300">{children}</td>,
                blockquote: ({ children }) => <blockquote className="mb-4 border-l-4 border-primary-200 pl-4 italic text-gray-600 dark:border-primary-800 dark:text-slate-400">{children}</blockquote>,
                hr: () => <hr className="my-6 border-gray-200 dark:border-slate-700" />,
                img: ({ src, alt }) => <img src={src} alt={alt} className="my-4 rounded-lg" />,
                strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-800 dark:text-slate-200">{children}</em>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
