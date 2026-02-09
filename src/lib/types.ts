export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          target_amount: number;
          current_amount: number;
          sort_order: number;
          has_progress_bar: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          target_amount?: number;
          current_amount?: number;
          sort_order?: number;
          has_progress_bar?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          target_amount?: number;
          current_amount?: number;
          sort_order?: number;
          has_progress_bar?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      donations: {
        Row: {
          id: string;
          category_id: string;
          donor_name: string;
          amount: number;
          is_anonymous: boolean;
          words_of_support: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          donor_name: string;
          amount: number;
          is_anonymous?: boolean;
          words_of_support?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          donor_name?: string;
          amount?: number;
          is_anonymous?: boolean;
          words_of_support?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Category = Database['public']['Tables']['categories']['Row'];
export type Donation = Database['public']['Tables']['donations']['Row'];
