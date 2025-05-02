export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      readme_jobs: {
        Row: {
          id: string
          repo_url: string
          status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
          content: string | null
          error: string | null
          progress: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          repo_url: string
          status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
          content?: string | null
          error?: string | null
          progress?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          repo_url?: string
          status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
          content?: string | null
          error?: string | null
          progress?: number
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}