import { lazy } from 'react';
import { Suspense } from 'react';
import { LoadingScreen as Loading } from '@/components/ui/LoadingScreen';

const Game = lazy(() => import('@/components/game/Game'));

export default function Home() {
  return (
    <main className="relative w-screen h-screen">
      <Suspense fallback={<Loading videoSrc="" onLoadComplete={() => {}} isLoading={true} />}>
        <Game />
      </Suspense>
    </main>
  );
} 