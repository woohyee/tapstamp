/**
 * 기본 이벤트 카트리지 인터페이스
 * 모든 스탬프 이벤트 카트리지는 이 인터페이스를 구현해야 함
 */

export interface CartridgeTrigger {
  stamps: number;          // 트리거되는 스탬프 개수
  type: string;           // 카트리지 타입 ('lottery', 'bonus', 'special' 등)
  allowDuplicates?: boolean; // 중복 참여 허용 여부 (기본: false)
}

export interface CartridgeResult {
  success: boolean;
  message?: string;
  redirect?: string;      // 리다이렉트할 URL
  data?: Record<string, unknown>;            // 카트리지별 추가 데이터
}

export interface CartridgeConfig {
  enabled: boolean;
  name: string;
  description: string;
  trigger: CartridgeTrigger;
  settings: Record<string, unknown>; // 카트리지별 커스텀 설정
}

export abstract class EventCartridge {
  protected config: CartridgeConfig;

  constructor(config: CartridgeConfig) {
    this.config = config;
  }

  /**
   * 카트리지가 트리거될 조건인지 확인
   */
  abstract shouldTrigger(stamps: number, customerId: string): Promise<boolean>;

  /**
   * 카트리지 실행
   */
  abstract execute(customerId: string): Promise<CartridgeResult>;

  /**
   * 카트리지 설정 가져오기
   */
  getConfig(): CartridgeConfig {
    return this.config;
  }

  /**
   * 카트리지 활성화 여부
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}