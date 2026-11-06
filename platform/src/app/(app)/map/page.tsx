import { Suspense } from 'react';
import { UnitMap } from '@/components/UnitMap';

export default function MapPage() {
  return (
    <Suspense>
      <UnitMap />
    </Suspense>
  );
}
