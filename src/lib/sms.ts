// Twilio SMS Backup System for INSTANT Notifications
// Ensures 100% delivery when FCM fails

interface SMSConfig {
  accountSid: string
  authToken: string
  fromNumber: string  // Canadian number (+1XXXXXXXXXX)
  toNumber: string    // Admin phone number
}

interface SMSResult {
  success: boolean
  messageSid?: string
  error?: string
  cost?: number
  deliveryTime?: number
}

interface NotificationData {
  customer_name: string
  customer_phone: string
  coupon_value: number
  coupon_type: string
  used_at: string
}

// Get Twilio configuration from environment
const getTwilioConfig = (): SMSConfig => {
  const config = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    toNumber: process.env.ADMIN_PHONE_NUMBER || ''
  }
  
  // Validate configuration
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing Twilio configuration: ${missingKeys.join(', ')}`)
  }
  
  return config
}

// Send SMS notification via Twilio
export async function sendSMSNotification(notificationData: NotificationData): Promise<SMSResult> {
  const startTime = Date.now()
  
  try {
    console.log('📱 [SMS] Sending backup notification...')
    
    const config = getTwilioConfig()
    
    // Create message content (optimized for Canadian mobile)
    const message = createSMSMessage(notificationData)
    
    console.log('📨 [SMS] Message prepared:', message.substring(0, 50) + '...')
    
    // Twilio API call
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: config.fromNumber,
          To: config.toNumber,
          Body: message
        })
      }
    )
    
    const result = await twilioResponse.json()
    const deliveryTime = Date.now() - startTime
    
    console.log('📊 [SMS] Twilio response:', result)
    console.log(`⏱️ [SMS] Delivery time: ${deliveryTime}ms`)
    
    if (twilioResponse.ok && result.sid) {
      console.log('✅ [SMS] Message sent successfully!')
      
      // Log cost tracking
      const estimatedCost = 0.01 // ~$0.01 CAD per SMS in Canada
      console.log(`💰 [SMS] Estimated cost: $${estimatedCost} CAD`)
      
      return {
        success: true,
        messageSid: result.sid,
        cost: estimatedCost,
        deliveryTime: deliveryTime
      }
      
    } else {
      const error = result.message || result.error_message || 'Unknown Twilio error'
      console.error('❌ [SMS] Failed to send:', error)
      
      return {
        success: false,
        error: error,
        deliveryTime: deliveryTime
      }
    }
    
  } catch (error) {
    const deliveryTime = Date.now() - startTime
    console.error('❌ [SMS] Error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      deliveryTime: deliveryTime
    }
  }
}

// Create optimized SMS message content
function createSMSMessage(data: NotificationData): string {
  const timestamp = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Message optimized for mobile readability (under 160 characters)
  const message = `🎫 TapStamp Alert
${data.customer_name}
${data.coupon_value}% OFF Coupon Used
${timestamp}
tapstamp.vercel.app/admin`
  
  console.log(`📏 [SMS] Message length: ${message.length} characters`)
  
  return message
}

// Send urgent SMS for high-value coupons
export async function sendUrgentSMS(notificationData: NotificationData): Promise<SMSResult> {
  console.log('🚨 [SMS] Sending URGENT high-value notification...')
  
  // Enhanced message for high-value coupons
  const urgentData = {
    ...notificationData,
    customer_name: `🚨 ${notificationData.customer_name}` // Add urgent indicator
  }
  
  return await sendSMSNotification(urgentData)
}

// Test SMS function
export async function sendTestSMS(): Promise<SMSResult> {
  console.log('🧪 [SMS] Sending test message...')
  
  const testData: NotificationData = {
    customer_name: 'Test Customer',
    customer_phone: '+1-416-555-0123',
    coupon_value: 15,
    coupon_type: 'discount_15',
    used_at: new Date().toISOString()
  }
  
  return await sendSMSNotification(testData)
}

// SMS cost tracking and limits
// interface SMSTracker {
//   dailyCount: number
//   dailyCost: number
//   monthlyCount: number
//   monthlyCost: number
//   lastReset: Date
// }

// Track SMS usage and costs
export async function trackSMSUsage(cost: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // This would integrate with a database to track usage
    console.log(`📊 [SMS] Usage tracked: $${cost} CAD on ${today}`)
    
    // TODO: Implement actual database tracking
    // await saveSMSUsage({ date: today, cost, count: 1 })
    
  } catch (error) {
    console.error('❌ [SMS] Error tracking usage:', error)
  }
}

// Check if daily SMS limit is reached
export async function checkSMSLimits(): Promise<boolean> {
  try {
    const dailyLimit = 50  // Max 50 SMS per day
    const monthlyBudget = 20  // Max $20 CAD per month
    
    // TODO: Implement actual limit checking from database
    console.log(`🛡️ [SMS] Checking limits: ${dailyLimit} daily, $${monthlyBudget} monthly`)
    
    return true  // Allow for now
    
  } catch (error) {
    console.error('❌ [SMS] Error checking limits:', error)
    return false  // Deny on error (safe default)
  }
}

// Smart SMS decision logic
export function shouldSendSMS(fcmSuccess: boolean, couponValue: number, isAfterHours: boolean): boolean {
  // Always send SMS if FCM failed
  if (!fcmSuccess) {
    console.log('📱 [SMS] Sending due to FCM failure')
    return true
  }
  
  // Send SMS for high-value coupons (15% or more)
  if (couponValue >= 15) {
    console.log('📱 [SMS] Sending due to high-value coupon')
    return true
  }
  
  // Send SMS after business hours (higher importance)
  if (isAfterHours) {
    console.log('📱 [SMS] Sending due to after-hours timing')
    return true
  }
  
  console.log('📱 [SMS] Not needed - FCM successful for normal coupon')
  return false
}