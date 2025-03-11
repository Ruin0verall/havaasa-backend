export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: number;
          title: string;
          content: string;
          excerpt?: string;
          image_url?: string;
          category_id: number;
          author?: string;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          title: string;
          content: string;
          excerpt?: string;
          image_url?: string;
          category_id: number;
          author?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          content?: string;
          excerpt?: string;
          image_url?: string;
          category_id?: number;
          author?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: number;
          name: string;
          created_at?: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      about_content: {
        Row: {
          id: number;
          title: string;
          content: string;
          mission?: string;
          vision?: string;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          title: string;
          content: string;
          mission?: string;
          vision?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          content?: string;
          mission?: string;
          vision?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
