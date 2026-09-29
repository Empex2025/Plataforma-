import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

import { ChevronRight, Pencil, Trash2 } from "lucide-react"

type Category = {
    id: string
    name: string
    children?: Category[]
}

function CategoryItem({ category }: { category: Category }) {
    const hasChildren = category.children && category.children.length > 0

    if (!hasChildren) {
        return (
            <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-muted">
                <span className="font-medium">{category.name}</span>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm">
                        <Pencil className="size-4" />
                    </Button>
                    <Button variant="destructive" size="icon-sm">
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <AccordionItem value={category.id}>
            <div className="flex items-center justify-between rounded-lg bg-muted">
                <AccordionTrigger className="flex-1 px-4 py-3 **:data-[slot=accordion-trigger-icon]:hidden">
                    <div className="flex items-center gap-2">
                        <ChevronRight strokeWidth={3} className="size-4 shrink-0 text-primary transition-transform group-aria-expanded/accordion-trigger:rotate-90" />
                        <span>{category.name}</span>
                    </div>
                </AccordionTrigger>
                <div className="flex items-center gap-1 pr-4">
                    <Button variant="outline" size="icon-sm">
                        <Pencil className="size-4" />
                    </Button>
                    <Button variant="destructive" size="icon-sm">
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>
            <AccordionContent className="pl-6">
                <div className="flex flex-col gap-2 py-2">
                    {category.children?.map((child) => (
                        <div
                            key={child.id}
                            className="flex items-center justify-between rounded-lg px-4 py-3 border-b"
                        >
                            <span className="font-medium">{child.name}</span>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon-sm">
                                    <Pencil className="size-4" />
                                </Button>
                                <Button variant="destructive" size="icon-sm">
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}

export default CategoryItem