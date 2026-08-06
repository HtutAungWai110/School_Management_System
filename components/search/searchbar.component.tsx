'use client'
import { useState } from "react"
import { Input } from "../ui/input.component"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

export default function SearchBar({ placeholder }: { placeholder: string }) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState<string>(searchParams.get("search") ?? "")


  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.push(`${path}?${params.toString()}`)
  }

  return (
    <div className="flex justify-between items-center border rounded-2xl overflow-hidden h-10">
      <Input
        className="border-none bg-none rounded-none focus:outline-none"
        value={search}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            handleSearch()
          }
        }}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder} />
      <button className="text-primary/50 cursor-pointer bg-primary/20 h-[100%] rounded-none px-5" onClick={handleSearch}><Search/></button>
    </div>
  )

}
