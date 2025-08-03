import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TapStamp Admin - Real-time Coupon Management",
  description: "Admin dashboard for managing TapStamp loyalty system with real-time notifications",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TapStamp Admin"
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "TapStamp Admin",
    "application-name": "TapStamp Admin",
    "msapplication-TileColor": "#3B82F6",
    "msapplication-tap-highlight": "no"
  }
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* PWA Install Prompt Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // PWA Install Prompt for Admin Dashboard
          let deferredPrompt;
          
          window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🏠 [PWA] Install prompt available');
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button or banner if needed
            if (localStorage.getItem('pwa_install_dismissed') !== 'true') {
              console.log('📱 [PWA] Ready to install TapStamp Admin');
            }
          });
          
          window.addEventListener('appinstalled', () => {
            console.log('✅ [PWA] TapStamp Admin installed successfully');
            deferredPrompt = null;
          });
          
          // Add to homescreen function
          window.installPWA = () => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                  console.log('✅ [PWA] User accepted install');
                } else {
                  console.log('❌ [PWA] User dismissed install');
                }
                deferredPrompt = null;
              });
            }
          };
        `
      }} />
      {children}
    </>
  );
}