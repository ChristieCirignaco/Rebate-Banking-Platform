-- CreateTable
CREATE TABLE "cms_menu_items" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "label" TEXT,
    "page_id" TEXT,
    "url" TEXT,
    "open_in_new" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cms_menu_items_location_sort_order_idx" ON "cms_menu_items"("location", "sort_order");

-- AddForeignKey
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "cms_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
