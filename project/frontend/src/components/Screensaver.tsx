
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";

// CONFIGURATION
const INACTIVITY_TIMEOUT_MS = 6000; // 1 minute
const ANIMATION_SPEED = 0.5; // Pixels per frame
const COMPONENT_WIDTH = 280; // Approx width of the card
const COMPONENT_HEIGHT = 120; // Approx height with padding

export function Screensaver() {
    const [isActive, setIsActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [currentTime, setCurrentTime] = useState(new Date());

    // Use refs for animation loop variables to avoid re-renders or closures
    const velocity = useRef({ x: ANIMATION_SPEED, y: ANIMATION_SPEED });
    const posRef = useRef({ x: 0, y: 0 });
    const requestRef = useRef<number | null>(null);
    const isDesktop = useRef(true);
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Activity Handler
    const resetTimer = useCallback(() => {
        if (!isDesktop.current) return;

        setIsActive(false);
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

        inactivityTimer.current = setTimeout(() => {
            if (isDesktop.current) {
                // Initialize random position at the corner
                posRef.current = { x: 0, y: 0 };
                setPosition({ x: 0, y: 0 });

                // Randomize initial direction
                velocity.current = {
                    x: 1 * ANIMATION_SPEED,
                    y: 1 * ANIMATION_SPEED
                };

                setIsActive(true);
            }
        }, INACTIVITY_TIMEOUT_MS);
    }, []);

    // Setup Event Listeners
    useEffect(() => {
        // Check if desktop
        const mediaQuery = window.matchMedia("(min-width: 768px)");
        isDesktop.current = mediaQuery.matches;

        const handleResize = () => {
            isDesktop.current = window.matchMedia("(min-width: 768px)").matches;
        };

        const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        window.addEventListener('resize', handleResize);

        // Start initial timer
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            window.removeEventListener('resize', handleResize);
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [resetTimer]);

    // Clock Logic (only runs when active)
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    // Animation Loop
    const animate = useCallback(() => {
        if (!isActive) return;

        const maxX = window.innerWidth - COMPONENT_WIDTH;
        const maxY = window.innerHeight - COMPONENT_HEIGHT;

        let { x, y } = posRef.current;
        let { x: vx, y: vy } = velocity.current;

        x += vx;
        y += vy;

        // Bounce Logic
        if (x <= 0 || x >= maxX) {
            velocity.current.x = -vx;
            x = Math.max(0, Math.min(x, maxX));
        }
        if (y <= 0 || y >= maxY) {
            velocity.current.y = -vy;
            y = Math.max(0, Math.min(y, maxY));
        }

        posRef.current = { x, y };
        setPosition({ x, y });

        requestRef.current = requestAnimationFrame(animate);
    }, [isActive]);

    useEffect(() => {
        if (isActive) {
            requestRef.current = requestAnimationFrame(animate);
        } else if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isActive, animate]);

    if (!isActive) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-md pointer-events-none transition-opacity duration-1000 animate-in fade-in"
        >
            <div
                className="absolute shadow-2xl overflow-hidden"
                style={{
                    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                    width: `${COMPONENT_WIDTH}px`,
                    height: `${COMPONENT_HEIGHT}px`,
                    willChange: 'transform'
                }}
            >
                <Card className="bg-slate-700/90 border-slate-700 shadow-xl backdrop-blur-xl rounded-sm h-full w-full">
                    <CardContent className="flex flex-col items-center justify-center py-4 h-full w-full">
                        <div className="text-3xl font-bold text-muted tracking-widest tabular-nums leading-none">
                            {currentTime.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-muted/67 font-medium mt-1 tracking-wide text-md font-mono">
                            {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'long' })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
