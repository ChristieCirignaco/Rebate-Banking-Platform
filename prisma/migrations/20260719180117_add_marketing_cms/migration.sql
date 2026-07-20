-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "breadcrumb" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_components" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema_key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'static',
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_protected" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_page_sections" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_component_contents" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_component_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_component_items" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "collection" TEXT NOT NULL DEFAULT 'items',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_component_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_component_item_contents" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_component_item_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_path_key" ON "cms_pages"("path");

-- CreateIndex
CREATE UNIQUE INDEX "cms_components_key_key" ON "cms_components"("key");

-- CreateIndex
CREATE INDEX "cms_page_sections_page_id_sort_order_idx" ON "cms_page_sections"("page_id", "sort_order");

-- CreateIndex
CREATE INDEX "cms_page_sections_component_id_idx" ON "cms_page_sections"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "cms_page_sections_page_id_component_id_key" ON "cms_page_sections"("page_id", "component_id");

-- CreateIndex
CREATE UNIQUE INDEX "cms_component_contents_component_id_locale_key" ON "cms_component_contents"("component_id", "locale");

-- CreateIndex
CREATE INDEX "cms_component_items_component_id_collection_sort_order_idx" ON "cms_component_items"("component_id", "collection", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cms_component_item_contents_item_id_locale_key" ON "cms_component_item_contents"("item_id", "locale");

-- AddForeignKey
ALTER TABLE "cms_page_sections" ADD CONSTRAINT "cms_page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "cms_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_page_sections" ADD CONSTRAINT "cms_page_sections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "cms_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_component_contents" ADD CONSTRAINT "cms_component_contents_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "cms_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_component_items" ADD CONSTRAINT "cms_component_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "cms_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_component_item_contents" ADD CONSTRAINT "cms_component_item_contents_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "cms_component_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
