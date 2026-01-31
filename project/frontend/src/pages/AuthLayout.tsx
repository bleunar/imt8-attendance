import { Outlet } from 'react-router-dom';
import Silk from '@/components/Silk';

export default function AuthLayout() {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-[#31354A] via-black to-[#31354A] overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <Silk
                    speed={1}
                    scale={0.35}
                    color="#31354A"
                    noiseIntensity={0.3}
                    rotation={90}
                />
            </div>

            {/* Page Content */}
            <Outlet />
        </div>
    );
}
