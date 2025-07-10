import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20', 
    lg: 'w-32 h-32',
    xl: 'w-56 h-56',
    '2xl': 'w-64 h-64'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    '2xl': 'text-5xl'
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Image
          src="/tapstamplogo.png"
          alt="TapStamp Logo"
          width={size === 'sm' ? 48 : size === 'md' ? 80 : size === 'lg' ? 128 : size === 'xl' ? 230 : 256}
          height={size === 'sm' ? 48 : size === 'md' ? 80 : size === 'lg' ? 128 : size === 'xl' ? 230 : 256}
          className={`${sizeClasses[size]} object-contain`}
        />
      </div>
      {showText && (
        <span className={`font-bold text-gray-800 ${textSizeClasses[size]}`}>
          TapStamp
        </span>
      )}
    </div>
  )
}