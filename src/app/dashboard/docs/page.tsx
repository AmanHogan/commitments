import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TDP_GUIDE_MD } from "@/lib/tdp-guide";

/**
 * Full TDP Midyear & Progressions guide page.
 * Renders the complete writing guide as formatted markdown.
 * @returns The rendered docs page.
 */
export default function DocsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-4xl py-8 px-4">
      <div className="prose prose-invert prose-sm sm:prose-base max-w-none
        prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:mb-4
        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
        prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
        prose-p:leading-relaxed
        prose-table:text-sm
        prose-th:bg-muted prose-th:px-3 prose-th:py-2
        prose-td:px-3 prose-td:py-2
        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
        prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-li:my-0.5
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {TDP_GUIDE_MD}
        </ReactMarkdown>
      </div>
    </div>
  );
}
