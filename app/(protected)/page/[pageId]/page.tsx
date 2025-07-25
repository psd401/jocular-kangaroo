import { notFound } from "next/navigation"
import { executeSQL } from "@/lib/db/data-api-adapter"
import { Suspense } from "react"
import Link from "next/link"
import logger from "@/lib/logger"
import { extractRDSString, ensureRDSNumber, toReactKey, ensureRDSString, type RDSFieldValue } from "@/lib/type-helpers"

interface PageProps {
  params: Promise<{ pageId: string }>
}

export default async function PublicPage({ params }: PageProps) {
  const { pageId } = await params
  
  try {
    // Construct the full link path from the pageId slug
    const pageLink = `/page/${pageId}`;

    // Fetch the page navigation item by link
    const pageItemSql = 'SELECT * FROM navigation_items WHERE link = :pageLink AND type = :type::navigation_type';
    const pageItemResult = await executeSQL(pageItemSql, [
      { name: 'pageLink', value: { stringValue: pageLink } },
      { name: 'type', value: { stringValue: 'page' } }
    ]);
    
    const pageItem = pageItemResult[0];
    if (!pageItem || pageItem.type !== "page") {
      notFound()
    }

  // Fetch all child links/tools of this page
  const childItemsSql = `
    SELECT * FROM navigation_items 
    WHERE parent_id = :parentId 
    AND type = 'link'::navigation_type 
    AND is_active = true
    ORDER BY position ASC
  `;
  const childItems = await executeSQL(childItemsSql, [
    { name: 'parentId', value: { longValue: ensureRDSNumber(pageItem.id as RDSFieldValue) } }
  ]);


  return (
    <>
      <h1 className="text-3xl font-bold mb-4">{ensureRDSString(pageItem.label as unknown as RDSFieldValue)}</h1>
      {pageItem.description && (
        <p className="mb-6 text-muted-foreground">{ensureRDSString(pageItem.description as unknown as RDSFieldValue)}</p>
      )}
      <Suspense fallback={<div>Loading tools...</div>}>
        {childItems.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">No tools assigned to this page.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {childItems.map((child) => {
              const href = extractRDSString(child.link as unknown as RDSFieldValue) || "#"
              return (
                <Link
                  key={toReactKey(child.id as unknown as RDSFieldValue)}
                  href={href}
                  className="block rounded-lg border bg-card shadow-sm hover:shadow-md transition p-6 group focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start">
                    <span className="text-3xl text-muted-foreground block">
                      <span className={`i-lucide:${extractRDSString(child.icon as unknown as RDSFieldValue) || 'file'}`} />
                    </span>
                    <div className="ml-4">
                      <div className="font-semibold text-lg">
                        {ensureRDSString(child.label as unknown as RDSFieldValue)}
                      </div>
                      <div className="text-muted-foreground text-sm mt-1">
                        {extractRDSString(child.description as unknown as RDSFieldValue)}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Suspense>
    </>
  )
  } catch (error) {
    logger.error('Error loading page:', error);
    notFound();
  }
} 