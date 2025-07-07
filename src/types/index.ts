export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  stamps: number
  vip_status: boolean
  vip_expires_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Stamp {
  id: string
  customer_id: string
  amount: number
  created_at: Date
}

export interface Coupon {
  id: string
  customer_id: string
  type: 'discount_10' | 'discount_20' | 'event_reward'
  value: number
  used: boolean
  used_at?: Date
  expires_at?: Date
  created_at: Date
}

export interface Event {
  id: string
  customer_id: string
  type: 'lottery' | 'ladder'
  result: string
  reward_coupon_id?: string
  created_at: Date
}

export interface StampRequest {
  customer_id?: string
  amount: number
}

export interface CustomerRegistration {
  name: string
  phone: string
  email?: string
}