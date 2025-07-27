/**
 * 카트리지 레지스트리
 * 설치된 카트리지들을 관리하고 실행
 */

import { EventCartridge, CartridgeResult } from './EventCartridge';

export class CartridgeRegistry {
  private cartridges: Map<string, EventCartridge> = new Map();

  /**
   * 카트리지 등록
   */
  register(id: string, cartridge: EventCartridge): void {
    if (cartridge.isEnabled()) {
      this.cartridges.set(id, cartridge);
      console.log(`카트리지 등록됨: ${id} - ${cartridge.getConfig().name}`);
    }
  }

  /**
   * 스탬프 수에 따라 트리거될 카트리지 찾기
   */
  async findTriggeredCartridge(stamps: number, customerId: string): Promise<EventCartridge | null> {
    for (const [id, cartridge] of this.cartridges) {
      if (await cartridge.shouldTrigger(stamps, customerId)) {
        console.log(`카트리지 트리거: ${id} (${stamps}개 스탬프)`);
        return cartridge;
      }
    }
    return null;
  }

  /**
   * 카트리지 실행
   */
  async executeCartridge(stamps: number, customerId: string): Promise<CartridgeResult | null> {
    const cartridge = await this.findTriggeredCartridge(stamps, customerId);
    
    if (cartridge) {
      console.log(`카트리지 실행 시작: ${customerId}`);
      return await cartridge.execute(customerId);
    }
    
    return null;
  }

  /**
   * 등록된 카트리지 목록
   */
  getRegisteredCartridges(): string[] {
    return Array.from(this.cartridges.keys());
  }

  /**
   * 카트리지 제거
   */
  unregister(id: string): void {
    this.cartridges.delete(id);
    console.log(`카트리지 제거됨: ${id}`);
  }
}

// 전역 카트리지 레지스트리
export const cartridgeRegistry = new CartridgeRegistry();