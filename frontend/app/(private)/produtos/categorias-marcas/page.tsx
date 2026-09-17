import { CategoriesTree } from "./_components/categories-tree"
import { BrandsSection } from "./_components/brands-section"

export default function CategoriasMarcasPage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
      <CategoriesTree />
      <BrandsSection />
    </div>
  )
}
