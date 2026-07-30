import * as v from 'valibot'

export const IdSchema = v.pipe(v.string(), v.nonEmpty())

export const PaginationSchema = v.object({
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 20),
})

export type Id = v.InferOutput<typeof IdSchema>
export type Pagination = v.InferOutput<typeof PaginationSchema>
