// ponytail: abstract interface only. Concrete implementations when data store chosen.
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: Omit<T, 'id'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
}
