export type MemberRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "RECEPTIONIST"
  | "STAFF";

/** Soft-delete + actor tracking columns shared by core tables. */
export type SoftDeleteFields = {
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_role: MemberRole | null;
  created_by: string | null;
  updated_by: string | null;
};

export type SoftDeleteInsert = {
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_by_role?: MemberRole | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type SoftDeleteUpdate = SoftDeleteInsert;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          whatsapp_phone: string | null;
          tagline: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          phone: string | null;
          email: string | null;
          logo_path: string | null;
          cover_path: string | null;
          arrival_notes: string | null;
          business_hours: Json | null;
          nav_permissions: Json;
          action_permissions: Json;
          booking_slot_minutes: number;
          booking_days_ahead: number;
          booking_advance_amount: number;
          booking_advance_percent: number;
          booking_payment_instructions: string | null;
          public_booking_enabled: boolean;
          trial_ends_at: string | null;
          subscription_ends_at: string | null;
          subscription_locked_at: string | null;
          subscription_status: string;
          admin_disabled_at: string | null;
          lifetime_access: boolean;
          lifetime_access_at: string | null;
          lifetime_access_by: string | null;
          public_listing_enabled: boolean;
          marketplace_store_enabled: boolean;
          marketplace_store_published_at: string | null;
          referred_by_partner_id: string | null;
          referral_code_used: string | null;
          late_grace_minutes: number;
          late_allowed_days_per_month: number;
          late_fine_amount: number;
          default_duty_start: string | null;
          default_duty_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          whatsapp_phone?: string | null;
          tagline?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_path?: string | null;
          cover_path?: string | null;
          arrival_notes?: string | null;
          business_hours?: Json | null;
          nav_permissions?: Json;
          action_permissions?: Json;
          booking_slot_minutes?: number;
          booking_days_ahead?: number;
          booking_advance_amount?: number;
          booking_advance_percent?: number;
          booking_payment_instructions?: string | null;
          public_booking_enabled?: boolean;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          subscription_locked_at?: string | null;
          subscription_status?: string;
          admin_disabled_at?: string | null;
          lifetime_access?: boolean;
          lifetime_access_at?: string | null;
          lifetime_access_by?: string | null;
          public_listing_enabled?: boolean;
          marketplace_store_enabled?: boolean;
          marketplace_store_published_at?: string | null;
          referred_by_partner_id?: string | null;
          referral_code_used?: string | null;
          late_grace_minutes?: number;
          late_allowed_days_per_month?: number;
          late_fine_amount?: number;
          default_duty_start?: string | null;
          default_duty_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          whatsapp_phone?: string | null;
          tagline?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_path?: string | null;
          cover_path?: string | null;
          arrival_notes?: string | null;
          business_hours?: Json | null;
          nav_permissions?: Json;
          action_permissions?: Json;
          booking_slot_minutes?: number;
          booking_days_ahead?: number;
          booking_advance_amount?: number;
          booking_advance_percent?: number;
          booking_payment_instructions?: string | null;
          public_booking_enabled?: boolean;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          subscription_locked_at?: string | null;
          subscription_status?: string;
          admin_disabled_at?: string | null;
          lifetime_access?: boolean;
          lifetime_access_at?: string | null;
          lifetime_access_by?: string | null;
          public_listing_enabled?: boolean;
          marketplace_store_enabled?: boolean;
          marketplace_store_published_at?: string | null;
          referred_by_partner_id?: string | null;
          referral_code_used?: string | null;
          late_grace_minutes?: number;
          late_allowed_days_per_month?: number;
          late_fine_amount?: number;
          default_duty_start?: string | null;
          default_duty_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          user_id: string | null;
          username: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          status: string;
          review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          username: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          status?: string;
          review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          username?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          status?: string;
          review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          invited_by: string | null;
          status: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          invited_by?: string | null;
          status?: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: MemberRole;
          token_hash?: string;
          invited_by?: string | null;
          status?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_commissions: {
        Row: {
          id: string;
          partner_id: string;
          organization_id: string;
          subscription_payment_id: string;
          amount_pkr: number;
          currency: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          organization_id: string;
          subscription_payment_id: string;
          amount_pkr: number;
          currency?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          organization_id?: string;
          subscription_payment_id?: string;
          amount_pkr?: number;
          currency?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_payment_accounts: {
        Row: {
          id: string;
          organization_id: string;
          account_type: string;
          label: string;
          account_title: string | null;
          account_number: string;
          bank_name: string | null;
          extra_note: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          account_type: string;
          label: string;
          account_title?: string | null;
          account_number: string;
          bank_name?: string | null;
          extra_note?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          account_type?: string;
          label?: string;
          account_title?: string | null;
          account_number?: string;
          bank_name?: string | null;
          extra_note?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_payments: {
        Row: {
          id: string;
          organization_id: string;
          amount: number;
          currency: string;
          payment_method: string;
          jazzcash_number: string;
          transaction_ref: string;
          payer_name: string | null;
          notes: string | null;
          status: string;
          submitted_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          invoice_path: string | null;
          invoice_mime: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          jazzcash_number?: string;
          transaction_ref: string;
          payer_name?: string | null;
          notes?: string | null;
          status?: string;
          submitted_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          invoice_path?: string | null;
          invoice_mime?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          jazzcash_number?: string;
          transaction_ref?: string;
          payer_name?: string | null;
          notes?: string | null;
          status?: string;
          submitted_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          invoice_path?: string | null;
          invoice_mime?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          tags: string[];
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          first_name: string;
          last_name?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          tags?: string[];
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          first_name?: string;
          last_name?: string | null;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          tags?: string[];
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      packages: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          price: number;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          price?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      package_items: {
        Row: {
          id: string;
          organization_id: string;
          package_id: string;
          service_id: string;
          quantity: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          package_id: string;
          service_id: string;
          quantity?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          package_id?: string;
          service_id?: string;
          quantity?: number;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "package_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_items_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string; organization_id: string; category_id: string | null; sku: string | null;
          name: string; description: string | null; cost_price: number; retail_price: number;
          stock_quantity: number; low_stock_threshold: number; is_active: boolean;
          product_kind: "RETAIL" | "IN_HOUSE" | "BOTH";
          unit_label: string | null;
          pack_size: number | null;
          default_usage_qty: number | null;
          deleted_at: string | null; deleted_by: string | null; deleted_by_role: MemberRole | null;
          created_by: string | null; updated_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; category_id?: string | null; sku?: string | null;
          name: string; description?: string | null; cost_price?: number; retail_price?: number;
          stock_quantity?: number; low_stock_threshold?: number; is_active?: boolean;
          product_kind?: "RETAIL" | "IN_HOUSE" | "BOTH";
          unit_label?: string | null;
          pack_size?: number | null;
          default_usage_qty?: number | null;
          deleted_at?: string | null; deleted_by?: string | null; deleted_by_role?: MemberRole | null;
          created_by?: string | null; updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; organization_id?: string; category_id?: string | null; sku?: string | null;
          name?: string; description?: string | null; cost_price?: number; retail_price?: number;
          stock_quantity?: number; low_stock_threshold?: number; is_active?: boolean;
          product_kind?: "RETAIL" | "IN_HOUSE" | "BOTH";
          unit_label?: string | null;
          pack_size?: number | null;
          default_usage_qty?: number | null;
          deleted_at?: string | null; deleted_by?: string | null; deleted_by_role?: MemberRole | null;
          created_by?: string | null; updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      service_product_usage: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          product_id: string;
          quantity_per_service: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          product_id: string;
          quantity_per_service: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          service_id?: string;
          product_id?: string;
          quantity_per_service?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_product_usage_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_product_usage_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_product_usage_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_usage_lines: {
        Row: {
          id: string;
          organization_id: string;
          sale_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_cost: number;
          unit_label: string | null;
          source: "RECIPE" | "OVERRIDE" | "MANUAL";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sale_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_cost?: number;
          unit_label?: string | null;
          source?: "RECIPE" | "OVERRIDE" | "MANUAL";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          sale_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_cost?: number;
          unit_label?: string | null;
          source?: "RECIPE" | "OVERRIDE" | "MANUAL";
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_transactions: {
        Row: {
          id: string; organization_id: string; product_id: string;
          type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number;
          reference_type: string | null; reference_id: string | null; notes: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; product_id: string;
          type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number;
          reference_type?: string | null; reference_id?: string | null; notes?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      sales: {
        Row: {
          id: string; organization_id: string; customer_id: string | null;
          appointment_id: string | null;
          staff_id: string | null;
          status: "DRAFT" | "COMPLETED" | "AMENDED" | "VOID" | "REFUNDED";
          payment_status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED";
          subtotal: number; discount: number; tax: number; total: number;
          deposit_applied: number;
          amount_paid: number; amount_refunded: number; amount_due: number;
          payment_version: number;
          notes: string | null;
          current_version: number;
          void_reason: string | null;
          voided_by: string | null;
          last_amended_at: string | null;
          last_amended_by: string | null;
          created_by: string | null; completed_at: string | null; voided_at: string | null;
          deleted_at: string | null; deleted_by: string | null; deleted_by_role: MemberRole | null;
          updated_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; customer_id?: string | null;
          appointment_id?: string | null;
          staff_id?: string | null;
          status?: "DRAFT" | "COMPLETED" | "AMENDED" | "VOID" | "REFUNDED";
          payment_status?: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED";
          subtotal?: number; discount?: number; tax?: number; total?: number;
          deposit_applied?: number;
          amount_paid?: number; amount_refunded?: number; amount_due?: number;
          payment_version?: number;
          notes?: string | null;
          current_version?: number;
          void_reason?: string | null;
          voided_by?: string | null;
          last_amended_at?: string | null;
          last_amended_by?: string | null;
          created_by?: string | null; completed_at?: string | null; voided_at?: string | null;
          deleted_at?: string | null; deleted_by?: string | null; deleted_by_role?: MemberRole | null;
          updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; organization_id?: string; customer_id?: string | null;
          appointment_id?: string | null;
          staff_id?: string | null;
          status?: "DRAFT" | "COMPLETED" | "AMENDED" | "VOID" | "REFUNDED";
          payment_status?: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED";
          subtotal?: number; discount?: number; tax?: number; total?: number;
          deposit_applied?: number;
          amount_paid?: number; amount_refunded?: number; amount_due?: number;
          payment_version?: number;
          notes?: string | null;
          current_version?: number;
          void_reason?: string | null;
          voided_by?: string | null;
          last_amended_at?: string | null;
          last_amended_by?: string | null;
          created_by?: string | null; completed_at?: string | null; voided_at?: string | null;
          deleted_at?: string | null; deleted_by?: string | null; deleted_by_role?: MemberRole | null;
          updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string; organization_id: string; sale_id: string;
          item_type: "SERVICE" | "PRODUCT" | "PACKAGE"; item_id: string; name: string;
          quantity: number; unit_price: number; line_total: number;
          unit_cost: number; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; sale_id: string;
          item_type: "SERVICE" | "PRODUCT" | "PACKAGE"; item_id: string; name: string;
          quantity?: number; unit_price: number; line_total: number;
          unit_cost?: number; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      sale_staff: {
        Row: {
          sale_id: string;
          staff_id: string;
          organization_id: string;
          created_at: string;
        };
        Insert: {
          sale_id: string;
          staff_id: string;
          organization_id: string;
          created_at?: string;
        };
        Update: {
          sale_id?: string;
          staff_id?: string;
          organization_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sale_versions: {
        Row: {
          id: string; organization_id: string; sale_id: string; version_number: number;
          customer_id: string | null; appointment_id: string | null;
          subtotal: number; discount: number; tax: number; deposit_applied: number;
          total: number; payment_total: number; status: string; notes: string | null;
          change_reason: string | null; changed_by: string | null; changed_at: string;
        };
        Insert: {
          id?: string; organization_id: string; sale_id: string; version_number: number;
          customer_id?: string | null; appointment_id?: string | null;
          subtotal?: number; discount?: number; tax?: number; deposit_applied?: number;
          total?: number; payment_total?: number; status: string; notes?: string | null;
          change_reason?: string | null; changed_by?: string | null; changed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "sale_versions_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_version_items: {
        Row: {
          id: string; organization_id: string; sale_version_id: string;
          item_type: "SERVICE" | "PRODUCT" | "PACKAGE"; item_id: string; name: string;
          quantity: number; unit_price: number; line_total: number; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; sale_version_id: string;
          item_type: "SERVICE" | "PRODUCT" | "PACKAGE"; item_id: string; name: string;
          quantity?: number; unit_price: number; line_total: number; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "sale_version_items_sale_version_id_fkey";
            columns: ["sale_version_id"];
            isOneToOne: false;
            referencedRelation: "sale_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_refunds: {
        Row: {
          id: string; organization_id: string; sale_id: string; amount: number;
          method: "CASH" | "CARD" | "OTHER"; reason: string; reference: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; sale_id: string; amount: number;
          method?: "CASH" | "CARD" | "OTHER"; reason: string; reference?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          sale_id: string;
          invoice_number: string;
          issued_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sale_id: string;
          invoice_number: string;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          invoice_number?: string;
          issued_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string; organization_id: string; sale_id: string;
          amount: number; method: "CASH" | "CARD" | "OTHER"; reference: string | null;
          notes: string | null; created_by: string | null;
          tendered_amount: number | null; change_given: number | null;
          paid_at: string; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; sale_id: string;
          amount: number; method?: "CASH" | "CARD" | "OTHER"; reference?: string | null;
          notes?: string | null; created_by?: string | null;
          tendered_amount?: number | null; change_given?: number | null;
          paid_at?: string; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      appointment_deposits: {
        Row: {
          id: string;
          organization_id: string;
          appointment_id: string;
          amount: number;
          method: "CASH" | "CARD" | "OTHER";
          notes: string | null;
          status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
          payment_reference: string | null;
          proof_path: string | null;
          approved_at: string | null;
          approved_by: string | null;
          applied_to_sale_id: string | null;
          paid_at: string;
          created_by: string | null;
          created_at: string;
          refund_reason: string | null;
          refund_method: "CASH" | "CARD" | "OTHER" | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          appointment_id: string;
          amount: number;
          method?: "CASH" | "CARD" | "OTHER";
          notes?: string | null;
          status?: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
          payment_reference?: string | null;
          proof_path?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          applied_to_sale_id?: string | null;
          paid_at?: string;
          created_by?: string | null;
          created_at?: string;
          refund_reason?: string | null;
          refund_method?: "CASH" | "CARD" | "OTHER" | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
        };
        Update: {
          amount?: number;
          status?: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
          payment_reference?: string | null;
          proof_path?: string | null;
          notes?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          applied_to_sale_id?: string | null;
          refund_reason?: string | null;
          refund_method?: "CASH" | "CARD" | "OTHER" | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          category:
            | "RENT"
            | "UTILITIES"
            | "SUPPLIES"
            | "PAYROLL"
            | "MARKETING"
            | "MAINTENANCE"
            | "OTHER";
          amount: number;
          description: string | null;
          expense_date: string;
          payment_method: "CASH" | "CARD" | "OTHER";
          created_by: string | null;
          staff_id: string | null;
          staff_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category?:
            | "RENT"
            | "UTILITIES"
            | "SUPPLIES"
            | "PAYROLL"
            | "MARKETING"
            | "MAINTENANCE"
            | "OTHER";
          amount: number;
          description?: string | null;
          expense_date?: string;
          payment_method?: "CASH" | "CARD" | "OTHER";
          staff_payment_id?: string | null;
          created_by?: string | null;
          staff_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?:
            | "RENT"
            | "UTILITIES"
            | "SUPPLIES"
            | "PAYROLL"
            | "MARKETING"
            | "MAINTENANCE"
            | "OTHER";
          amount?: number;
          description?: string | null;
          expense_date?: string;
          payment_method?: "CASH" | "CARD" | "OTHER";
          staff_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_payments: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string;
          amount: number;
          payment_type: "SALARY" | "PARTIAL" | "ADVANCE" | "BONUS";
          payment_method: "CASH" | "CARD" | "OTHER";
          payment_date: string;
          paid_at: string;
          period_start: string | null;
          period_end: string | null;
          amount_due: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id: string;
          amount: number;
          payment_type?: "SALARY" | "PARTIAL" | "ADVANCE" | "BONUS";
          payment_method?: "CASH" | "CARD" | "OTHER";
          payment_date?: string;
          paid_at?: string;
          period_start?: string | null;
          period_end?: string | null;
          amount_due?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string; organization_id: string; customer_id: string | null;
          direction: "INBOUND" | "OUTBOUND"; status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
          phone: string; body: string; external_id: string | null;
          metadata: Record<string, unknown>; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; customer_id?: string | null;
          direction: "INBOUND" | "OUTBOUND"; status?: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
          phone: string; body: string; external_id?: string | null;
          metadata?: Record<string, unknown>; created_at?: string;
        };
        Update: {
          customer_id?: string | null;
          direction?: "INBOUND" | "OUTBOUND";
          status?: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
          phone?: string;
          body?: string;
          external_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      whatsapp_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          body: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          body: string;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          body?: string;
          is_default?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_feedback: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          walk_in_name: string | null;
          staff_id: string | null;
          rating_overall: number;
          rating_behaviour: number;
          rating_expertise: number;
          rating_service: number;
          rating_cleanliness: number;
          rating_value: number;
          rating_wait_time: number;
          comment: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          walk_in_name?: string | null;
          staff_id?: string | null;
          rating_overall: number;
          rating_behaviour: number;
          rating_expertise: number;
          rating_service: number;
          rating_cleanliness: number;
          rating_value: number;
          rating_wait_time: number;
          comment?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string; organization_id: string; user_id: string | null;
          actor_role: MemberRole | null; actor_email: string | null;
          action: string; entity_type: string; entity_id: string | null;
          metadata: Record<string, unknown>; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; user_id?: string | null;
          actor_role?: MemberRole | null; actor_email?: string | null;
          action: string; entity_type: string; entity_id?: string | null;
          metadata?: Record<string, unknown>; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      staff: {
        Row: {
          id: string; organization_id: string; member_id: string | null;
          full_name: string; phone: string | null; email: string | null;
          job_title: string | null; pin_code: string | null;
          thumb_id: string | null; thumb_enrolled_at: string | null;
          is_active: boolean;
          online_booking_enabled: boolean;
          employee_code: string | null;
          department: string | null;
          pay_type: "MONTHLY" | "HOURLY" | null;
          monthly_salary: number | null;
          hourly_rate: number | null;
          expected_hours_per_day: number;
          expected_days_per_week: number;
          break_minutes_per_day: number;
          break_paid: boolean;
          overtime_eligible: boolean;
          overtime_multiplier: number;
          salary_policy: "FIXED" | "ATTENDANCE_ADJUSTED";
          weekly_off_days: number[];
          schedule_start_time: string | null;
          schedule_end_time: string | null;
          salary_effective_from: string | null;
          hired_on: string | null;
          left_on: string | null;
          deleted_at: string | null; deleted_by: string | null; deleted_by_role: MemberRole | null;
          created_by: string | null; updated_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; member_id?: string | null;
          full_name: string; phone?: string | null; email?: string | null;
          job_title?: string | null; pin_code?: string | null;
          thumb_id?: string | null; thumb_enrolled_at?: string | null;
          is_active?: boolean;
          online_booking_enabled?: boolean;
          employee_code?: string | null;
          department?: string | null;
          pay_type?: "MONTHLY" | "HOURLY" | null;
          monthly_salary?: number | null;
          hourly_rate?: number | null;
          expected_hours_per_day?: number;
          expected_days_per_week?: number;
          break_minutes_per_day?: number;
          break_paid?: boolean;
          overtime_eligible?: boolean;
          overtime_multiplier?: number;
          salary_policy?: "FIXED" | "ATTENDANCE_ADJUSTED";
          weekly_off_days?: number[];
          schedule_start_time?: string | null;
          schedule_end_time?: string | null;
          salary_effective_from?: string | null;
          hired_on?: string | null;
          left_on?: string | null;
          deleted_at?: string | null; deleted_by?: string | null; deleted_by_role?: MemberRole | null;
          created_by?: string | null; updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_schedules: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      staff_attendance: {
        Row: {
          id: string; organization_id: string; staff_id: string; device_id: string | null;
          check_in_at: string; check_out_at: string | null;
          method: "MANUAL" | "DEVICE" | "APP" | "BIOMETRIC"; notes: string | null; created_at: string;
          break_minutes: number; approved: boolean; locked: boolean;
          corrected_by: string | null; corrected_at: string | null; correction_note: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_attendance_days: {
        Row: {
          id: string; organization_id: string; staff_id: string; work_date: string;
          status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | "WEEKLY_OFF";
          payable_hours: number | null; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_salary_history: {
        Row: {
          id: string; organization_id: string; staff_id: string;
          pay_type: "MONTHLY" | "HOURLY" | null;
          monthly_salary: number | null; hourly_rate: number | null;
          expected_hours_per_day: number | null; expected_days_per_week: number | null;
          break_minutes_per_day: number | null; break_paid: boolean | null;
          overtime_eligible: boolean | null; overtime_multiplier: number | null;
          salary_policy: "FIXED" | "ATTENDANCE_ADJUSTED" | null;
          weekly_off_days: number[] | null; effective_from: string;
          changed_by: string | null; notes: string | null; created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      payroll_runs: {
        Row: {
          id: string; organization_id: string;
          period_year: number; period_month: number;
          period_start: string; period_end: string;
          status: "DRAFT" | "REVIEWED" | "APPROVED" | "PAID";
          total_gross: number; total_deductions: number; total_net: number;
          total_regular_hours: number; total_overtime_hours: number; staff_count: number;
          notes: string | null;
          generated_by: string | null; reviewed_by: string | null;
          approved_by: string | null; paid_by: string | null;
          generated_at: string; reviewed_at: string | null;
          approved_at: string | null; paid_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      payroll_run_lines: {
        Row: {
          id: string; organization_id: string; payroll_run_id: string; staff_id: string;
          pay_type: "MONTHLY" | "HOURLY";
          salary_policy: "FIXED" | "ATTENDANCE_ADJUSTED" | null;
          base_rate: number; days_present: number; days_absent: number; days_leave: number;
          expected_working_days: number; regular_hours: number; overtime_hours: number;
          regular_earnings: number; overtime_earnings: number; other_earnings: number;
          gross_earnings: number; advances: number; other_deductions: number;
          total_deductions: number; net_pay: number;
          payment_id: string | null; breakdown: Record<string, unknown>; created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_fines: {
        Row: {
          id: string; organization_id: string; staff_id: string; work_date: string;
          reason: "LATE" | "ABSENCE" | "HALF_DAY" | "OTHER";
          amount: number; status: "OPEN" | "WAIVED" | "APPLIED";
          minutes_late: number | null; grace_minutes: number | null; notes: string | null;
          payroll_run_id: string | null;
          waived_by: string | null; waived_at: string | null; waive_note: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      staff_notes: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string;
          note_type: "WARNING" | "COMPLAINT" | "PRAISE" | "NOTE";
          title: string;
          details: string | null;
          severity: number;
          occurred_on: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id: string;
          note_type: "WARNING" | "COMPLAINT" | "PRAISE" | "NOTE";
          title: string;
          details?: string | null;
          severity?: number;
          occurred_on?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          note_type?: "WARNING" | "COMPLAINT" | "PRAISE" | "NOTE";
          title?: string;
          details?: string | null;
          severity?: number;
          occurred_on?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string; organization_id: string; customer_id: string; staff_id: string | null;
          scheduled_at: string; duration_minutes: number;
          status: string; source: string; notes: string | null;
          booking_number: string | null;
          manual_payment_amount: number | null; manual_payment_method: string | null;
          manual_payment_notes: string | null; manual_payment_at: string | null;
          deleted_at: string | null; deleted_by: string | null; deleted_by_role: MemberRole | null;
          created_by: string | null; updated_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      appointment_services: {
        Row: { id: string; organization_id: string; appointment_id: string; service_id: string; service_name: string; price: number; duration_minutes: number; created_at: string };
        Insert: Record<string, unknown>;
        Update: Record<string, never>;
        Relationships: [];
      };
      queue_tokens: {
        Row: {
          id: string; organization_id: string; token_number: number; token_date: string;
          customer_id: string | null; appointment_id: string | null; customer_name: string;
          staff_id: string | null; chair_id: string | null; chair: string | null; issued_at: string;
          status: string; device_id: string | null; called_at: string | null;
          completed_at: string | null; created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      chairs: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_by_role: MemberRole | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_by_role?: MemberRole | null;
          created_by?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string; organization_id: string; name: string; type: string;
          api_key: string; location: string | null; is_active: boolean;
          auto_registered: boolean; last_seen_at: string | null;
          config: Record<string, unknown>; created_at: string; updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      device_commands: {
        Row: {
          id: string; organization_id: string; device_id: string; command: string;
          payload: Record<string, unknown>; status: string; error_message: string | null;
          created_at: string; completed_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      marketplace_sellers: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          shop_name: string;
          slug: string;
          bio: string | null;
          phone: string | null;
          payout_notes: string | null;
          logo_url: string | null;
          cover_url: string | null;
          verified_at: string | null;
          featured_until: string | null;
          store_published_at: string | null;
          delivery_notes: string | null;
          supports_cod: boolean;
          accepts_cod: boolean;
          accepts_card: boolean;
          account_email: string | null;
          invoice_email: string | null;
          cod_terms: string | null;
          cod_prep_note: string | null;
          card_instructions: string | null;
          card_account_title: string | null;
          card_account_number: string | null;
          card_bank_name: string | null;
          card_networks: string | null;
          city: string | null;
          country: string | null;
          status: "pending" | "approved" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          shop_name: string;
          slug: string;
          bio?: string | null;
          phone?: string | null;
          payout_notes?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          verified_at?: string | null;
          featured_until?: string | null;
          store_published_at?: string | null;
          delivery_notes?: string | null;
          supports_cod?: boolean;
          accepts_cod?: boolean;
          accepts_card?: boolean;
          account_email?: string | null;
          invoice_email?: string | null;
          cod_terms?: string | null;
          cod_prep_note?: string | null;
          card_instructions?: string | null;
          card_account_title?: string | null;
          card_account_number?: string | null;
          card_bank_name?: string | null;
          card_networks?: string | null;
          city?: string | null;
          country?: string | null;
          status?: "pending" | "approved" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_sellers"]["Insert"]>;
        Relationships: [];
      };
      marketplace_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          is_active: boolean;
          parent_id: string | null;
          kind: "product" | "service" | "both";
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          is_active?: boolean;
          parent_id?: string | null;
          kind?: "product" | "service" | "both";
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_categories"]["Insert"]>;
        Relationships: [];
      };
      marketplace_brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_brands"]["Insert"]>;
        Relationships: [];
      };
      marketplace_settings: {
        Row: {
          id: number;
          listing_fee: number;
          default_commission_rate: number;
          featured_listing_price: number;
          advertising_price: number;
          online_payments_enabled: boolean;
          marketplace_enabled: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          listing_fee?: number;
          default_commission_rate?: number;
          featured_listing_price?: number;
          advertising_price?: number;
          online_payments_enabled?: boolean;
          marketplace_enabled?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_settings"]["Insert"]>;
        Relationships: [];
      };
      marketplace_commission_rules: {
        Row: {
          id: string;
          scope: "global" | "category" | "seller" | "product";
          category_id: string | null;
          seller_id: string | null;
          product_id: string | null;
          rate: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scope: "global" | "category" | "seller" | "product";
          category_id?: string | null;
          seller_id?: string | null;
          product_id?: string | null;
          rate: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_commission_rules"]["Insert"]>;
        Relationships: [];
      };
      marketplace_products: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          brand_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          price: number;
          sale_price: number | null;
          cost_price: number | null;
          sku: string | null;
          barcode: string | null;
          stock: number;
          low_stock_threshold: number;
          weight_grams: number | null;
          image_url: string | null;
          video_url: string | null;
          video_path: string | null;
          reel_video_url: string | null;
          reel_video_path: string | null;
          description_html: string | null;
          media_bytes_total: number;
          seo_title: string | null;
          seo_description: string | null;
          status: "draft" | "pending" | "published" | "rejected";
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          category_id?: string | null;
          brand_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          short_description?: string | null;
          price: number;
          sale_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          stock?: number;
          low_stock_threshold?: number;
          weight_grams?: number | null;
          image_url?: string | null;
          video_url?: string | null;
          video_path?: string | null;
          reel_video_url?: string | null;
          reel_video_path?: string | null;
          description_html?: string | null;
          media_bytes_total?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          status?: "draft" | "pending" | "published" | "rejected";
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_products"]["Insert"]>;
        Relationships: [];
      };
      marketplace_product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          storage_path: string | null;
          byte_size: number;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          storage_path?: string | null;
          byte_size?: number;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_product_images"]["Insert"]>;
        Relationships: [];
      };
      marketplace_product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          price: number;
          sale_price: number | null;
          stock: number;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          price: number;
          sale_price?: number | null;
          stock?: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_product_variants"]["Insert"]>;
        Relationships: [];
      };
      marketplace_orders: {
        Row: {
          id: string;
          order_number: string;
          buyer_name: string;
          buyer_phone: string;
          buyer_address: string;
          buyer_notes: string | null;
          buyer_user_id: string | null;
          status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_method: string;
          payment_status: "unpaid" | "pending" | "paid" | "refunded" | "partially_refunded";
          payment_provider: string;
          idempotency_key: string | null;
          currency: string;
          subtotal: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          buyer_name: string;
          buyer_phone: string;
          buyer_address: string;
          buyer_notes?: string | null;
          buyer_user_id?: string | null;
          status?: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_method?: string;
          payment_status?: "unpaid" | "pending" | "paid" | "refunded" | "partially_refunded";
          payment_provider?: string;
          idempotency_key?: string | null;
          currency?: string;
          subtotal?: number;
          total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_orders"]["Insert"]>;
        Relationships: [];
      };
      marketplace_seller_orders: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          status:
            | "placed"
            | "confirmed"
            | "processing"
            | "ready"
            | "shipped"
            | "delivered"
            | "cancelled";
          subtotal: number;
          shipping_fee: number;
          total: number;
          tracking_number: string | null;
          seller_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          status?:
            | "placed"
            | "confirmed"
            | "processing"
            | "ready"
            | "shipped"
            | "delivered"
            | "cancelled";
          subtotal?: number;
          shipping_fee?: number;
          total?: number;
          tracking_number?: string | null;
          seller_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_seller_orders"]["Insert"]>;
        Relationships: [];
      };
      marketplace_order_items: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          seller_order_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          variant_name: string | null;
          product_title: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          fulfillment_status:
            | "placed"
            | "confirmed"
            | "processing"
            | "ready"
            | "shipped"
            | "delivered"
            | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          seller_order_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          variant_name?: string | null;
          product_title: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          fulfillment_status?:
            | "placed"
            | "confirmed"
            | "processing"
            | "ready"
            | "shipped"
            | "delivered"
            | "cancelled";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_order_items"]["Insert"]>;
        Relationships: [];
      };
      marketplace_commissions: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          gross_amount: number;
          rate: number;
          commission_amount: number;
          payout_status: "owed" | "paid";
          payout_id: string | null;
          rule_scope: "global" | "category" | "seller" | "product" | "settings" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          gross_amount: number;
          rate?: number;
          commission_amount: number;
          payout_status?: "owed" | "paid";
          payout_id?: string | null;
          rule_scope?: "global" | "category" | "seller" | "product" | "settings" | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_commissions"]["Insert"]>;
        Relationships: [];
      };
      marketplace_seller_ledger: {
        Row: {
          id: string;
          seller_id: string;
          entry_type:
            | "SELLER_CREDIT"
            | "SELLER_DEBIT"
            | "COMMISSION"
            | "REFUND"
            | "PAYOUT"
            | "ADJUSTMENT";
          amount: number;
          currency: string;
          order_id: string | null;
          seller_order_id: string | null;
          commission_id: string | null;
          payout_id: string | null;
          idempotency_key: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          seller_id: string;
          entry_type:
            | "SELLER_CREDIT"
            | "SELLER_DEBIT"
            | "COMMISSION"
            | "REFUND"
            | "PAYOUT"
            | "ADJUSTMENT";
          amount: number;
          currency?: string;
          order_id?: string | null;
          seller_order_id?: string | null;
          commission_id?: string | null;
          payout_id?: string | null;
          idempotency_key?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_seller_ledger"]["Insert"]>;
        Relationships: [];
      };
      marketplace_payout_requests: {
        Row: {
          id: string;
          seller_id: string;
          amount: number;
          currency: string;
          status: "pending" | "approved" | "rejected" | "held" | "completed" | "cancelled";
          method: "manual" | "bank" | "wallet" | "provider";
          payout_details: string | null;
          review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          payout_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          amount: number;
          currency?: string;
          status?: "pending" | "approved" | "rejected" | "held" | "completed" | "cancelled";
          method?: "manual" | "bank" | "wallet" | "provider";
          payout_details?: string | null;
          review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          payout_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_payout_requests"]["Insert"]>;
        Relationships: [];
      };
      marketplace_payment_intents: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          provider_ref: string | null;
          amount: number;
          currency: string;
          status: "created" | "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
          idempotency_key: string;
          raw_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider: string;
          provider_ref?: string | null;
          amount: number;
          currency?: string;
          status?: "created" | "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
          idempotency_key: string;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_payment_intents"]["Insert"]>;
        Relationships: [];
      };
      marketplace_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          full_name: string;
          phone: string;
          line1: string;
          line2: string | null;
          city: string;
          area: string | null;
          country: string;
          postal_code: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          full_name: string;
          phone: string;
          line1: string;
          line2?: string | null;
          city: string;
          area?: string | null;
          country?: string;
          postal_code?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_addresses"]["Insert"]>;
        Relationships: [];
      };
      marketplace_wishlists: {
        Row: {
          id: string;
          user_id: string;
          target_type: "product" | "salon" | "service";
          product_id: string | null;
          organization_id: string | null;
          service_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: "product" | "salon" | "service";
          product_id?: string | null;
          organization_id?: string | null;
          service_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_wishlists"]["Insert"]>;
        Relationships: [];
      };
      marketplace_featured_listings: {
        Row: {
          id: string;
          target_type: "seller" | "product" | "salon";
          seller_id: string | null;
          product_id: string | null;
          organization_id: string | null;
          kind: "featured" | "sponsored";
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "seller" | "product" | "salon";
          seller_id?: string | null;
          product_id?: string | null;
          organization_id?: string | null;
          kind?: "featured" | "sponsored";
          starts_at?: string;
          ends_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_featured_listings"]["Insert"]>;
        Relationships: [];
      };
      marketplace_analytics_events: {
        Row: {
          id: string;
          event_type: string;
          user_id: string | null;
          seller_id: string | null;
          product_id: string | null;
          organization_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          user_id?: string | null;
          seller_id?: string | null;
          product_id?: string | null;
          organization_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_analytics_events"]["Insert"]>;
        Relationships: [];
      };
      marketplace_payouts: {
        Row: {
          id: string;
          seller_id: string;
          amount: number;
          notes: string | null;
          paid_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          amount: number;
          notes?: string | null;
          paid_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_payouts"]["Insert"]>;
        Relationships: [];
      };
      marketplace_reviews: {
        Row: {
          id: string;
          product_id: string;
          rating: number;
          comment: string | null;
          reviewer_name: string;
          is_hidden: boolean;
          user_id: string | null;
          order_item_id: string | null;
          is_verified: boolean;
          seller_reply: string | null;
          seller_replied_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          rating: number;
          comment?: string | null;
          reviewer_name: string;
          is_hidden?: boolean;
          user_id?: string | null;
          order_item_id?: string | null;
          is_verified?: boolean;
          seller_reply?: string | null;
          seller_replied_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_reviews"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_queue_token_number: { Args: { org_id: string }; Returns: number };
      next_booking_number: { Args: { org_id: string }; Returns: string };
      next_marketplace_order_number: { Args: Record<string, never>; Returns: string };
      marketplace_resolve_commission_rate: {
        Args: {
          p_product_id: string | null;
          p_seller_id: string;
          p_category_id: string | null;
        };
        Returns: number;
      };
      customer_directory_stats: {
        Args: {
          p_organization_id: string;
          p_customer_ids: string[];
          p_since?: string;
        };
        Returns: {
          customer_id: string;
          total_spent: number;
          visit_count: number;
          last_visit_at: string | null;
        }[];
      };
      customer_lifetime_stats: {
        Args: {
          p_organization_id: string;
          p_customer_id: string;
        };
        Returns: {
          total_spent: number;
          visit_count: number;
        }[];
      };
      dashboard_top_services: {
        Args: {
          p_organization_id: string;
          p_since: string;
          p_limit?: number;
        };
        Returns: {
          name: string;
          qty: number;
          revenue: number;
        }[];
      };
      dashboard_revenue_by_day: {
        Args: {
          p_organization_id: string;
          p_since: string;
          p_until: string;
        };
        Returns: {
          day: string;
          revenue: number;
        }[];
      };
      dashboard_appointments_by_day: {
        Args: {
          p_organization_id: string;
          p_since: string;
          p_until: string;
        };
        Returns: {
          day: string;
          appt_count: number;
        }[];
      };
      dashboard_retention_stats: {
        Args: {
          p_organization_id: string;
          p_since: string;
        };
        Returns: {
          customers_with_sales: number;
          returning_customers: number;
          total_spend: number;
        }[];
      };
      finance_period_cash_totals: {
        Args: {
          p_organization_id: string;
          p_start: string;
          p_end: string;
          p_from_date: string;
          p_to_date: string;
        };
        Returns: {
          advances_collected: number;
          unapplied_deposits: number;
          staff_payments: number;
          staff_payment_count: number;
          cash_from_sales: number;
          expenses_total: number;
          expense_count: number;
          expenses_by_category: Record<string, number>;
          sale_refunds_total: number;
          staff_payments_by_type?: Record<string, number> | null;
        }[];
      };
      finance_period_sales_bundle: {
        Args: {
          p_organization_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: {
          sales_revenue: number;
          sale_count: number;
          posted_ids: string[];
          usage_ids: string[];
        }[];
      };
      dashboard_inventory_valuation: {
        Args: {
          p_organization_id: string;
        };
        Returns: {
          value_at_cost: number;
          value_at_retail: number;
          units_on_hand: number;
          retail_value_at_cost?: number;
          retail_value_at_retail?: number;
          retail_units?: number;
          in_house_value_at_cost?: number;
          in_house_units?: number;
        }[];
      };
      low_stock_products: {
        Args: {
          p_organization_id: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          name: string;
          stock_quantity: number;
          low_stock_threshold: number;
        }[];
      };
    };
    Enums: {
      member_role: MemberRole;
      product_kind: "RETAIL" | "IN_HOUSE" | "BOTH";
      inventory_transaction_type: "IN" | "OUT" | "ADJUSTMENT";
      sale_status: "DRAFT" | "COMPLETED" | "AMENDED" | "VOID" | "REFUNDED";
      sale_item_type: "SERVICE" | "PRODUCT" | "PACKAGE";
      payment_method: "CASH" | "CARD" | "OTHER";
      whatsapp_direction: "INBOUND" | "OUTBOUND";
      whatsapp_status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type ServiceCategory =
  Database["public"]["Tables"]["service_categories"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Package = Database["public"]["Tables"]["packages"]["Row"];
export type PackageItem = Database["public"]["Tables"]["package_items"]["Row"];
export type ProductCategory = Database["public"]["Tables"]["product_categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductKind = Database["public"]["Enums"]["product_kind"];
export type ServiceProductUsage =
  Database["public"]["Tables"]["service_product_usage"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
