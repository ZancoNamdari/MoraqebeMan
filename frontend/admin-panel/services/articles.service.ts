import { api } from "./api"

export interface ArticleListItem {
  id: number
  title: string
  slug: string
  summary: string
  cover_image: string | null
  is_published: boolean
  author_username: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ArticleDetail extends ArticleListItem {
  body: string
}

export const articlesService = {
  async list(): Promise<ArticleListItem[]> {
    const { data } = await api.get("/api/articles/")
    return data
  },

  async detail(id: number): Promise<ArticleDetail> {
    const { data } = await api.get(`/api/articles/${id}/`)
    return data
  },

  async create(payload: { title: string; summary: string; body: string; cover_image?: File | null }) {
    const formData = new FormData()
    formData.append("title", payload.title)
    formData.append("summary", payload.summary)
    formData.append("body", payload.body)
    if (payload.cover_image) formData.append("cover_image", payload.cover_image)

    const { data } = await api.post("/api/articles/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data as ArticleDetail
  },

  async update(id: number, payload: Partial<{ title: string; summary: string; body: string; cover_image: File | null }>) {
    const formData = new FormData()
    if (payload.title !== undefined) formData.append("title", payload.title)
    if (payload.summary !== undefined) formData.append("summary", payload.summary)
    if (payload.body !== undefined) formData.append("body", payload.body)
    if (payload.cover_image) formData.append("cover_image", payload.cover_image)

    const { data } = await api.patch(`/api/articles/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data as ArticleDetail
  },

  async remove(id: number) {
    await api.delete(`/api/articles/${id}/`)
  },

  async publish(id: number) {
    const { data } = await api.post(`/api/articles/${id}/publish/`)
    return data as ArticleDetail
  },

  async unpublish(id: number) {
    const { data } = await api.post(`/api/articles/${id}/unpublish/`)
    return data as ArticleDetail
  },
}
