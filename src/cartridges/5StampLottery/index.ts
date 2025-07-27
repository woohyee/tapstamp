/**
 * 5개 스탬프 랜덤 쿠폰 카트리지
 */

import { EventCartridge, CartridgeConfig, CartridgeResult } from '../base/EventCartridge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import config from './config.json';

export class FiveStampLotteryCartridge extends EventCartridge {
  constructor() {
    super(config as CartridgeConfig);
  }

  async shouldTrigger(stamps: number, customerId: string): Promise<boolean> {
    // 정확히 5개 스탬프일 때만 트리거
    if (stamps !== this.config.trigger.stamps) {
      return false;
    }

    // 이미 참여했는지 확인 (중복 방지)
    if (!this.config.trigger.allowDuplicates) {
      const eventsQuery = query(
        collection(db, 'events'), 
        where('customer_id', '==', customerId),
        where('event_type', '==', 'lottery')
      )
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        console.log('이미 복권 이벤트에 참여한 고객:', customerId);
        return false;
      }
    }

    return true;
  }

  async execute(customerId: string): Promise<CartridgeResult> {
    try {
      // 이벤트 참여 기록 생성
      try {
        await addDoc(collection(db, 'events'), {
          customer_id: customerId,
          event_type: 'lottery',
          event_data: { eligible: true, cartridge: '5StampLottery' },
          created_at: new Date()
        });
      } catch (eventError) {
        console.error('이벤트 기록 생성 실패:', eventError);
        return {
          success: false,
          message: '이벤트 처리 중 오류가 발생했습니다.'
        };
      }

      // 성공 - 카트리지 페이지로 리다이렉트
      return {
        success: true,
        message: '5개 스탬프 달성! 랜덤 쿠폰 이벤트에 참여하세요!',
        redirect: this.config.settings.redirectUrl as string,
        data: {
          customerId,
          eventType: 'lottery',
          cartridge: '5StampLottery'
        }
      };

    } catch (error) {
      console.error('카트리지 실행 오류:', error);
      return {
        success: false,
        message: '카트리지 실행 중 오류가 발생했습니다.'
      };
    }
  }
}