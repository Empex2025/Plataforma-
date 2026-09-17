import { ProductsPagination } from "./_components/products-pagination"
import { ProductsTable } from "./_components/products-table"
import { ProductsToolbar } from "./_components/products-toolbar"

export default function ProdutosPage() {
  return (
    <div className="flex flex-col gap-4">
      <ProductsToolbar />
      <ProductsTable />
      <ProductsPagination />
    </div>
  )
}
