'use client';

import { BarList, Donut } from './Charts';

export default function TrafficTab({ traffic }) {
  const t = traffic || {};
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <BarList title="Kanaler" items={t.channels || []} nameKey="channel" valueKey="sessions" color="#cf97fc" />
        <BarList title="Kilder" items={t.sources || []} nameKey="source" valueKey="sessions" color="#a78bfa" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Donut title="Enheter" data={t.devices || []} nameKey="device" valueKey="sessions" />
        <BarList title="Nettlesere" items={t.browsers || []} nameKey="browser" valueKey="sessions" color="#3b82f6" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <BarList title="Mest besokte sider" items={t.topPages || []} nameKey="path" valueKey="views" color="#0a0a0a" />
        <BarList title="Land (fra tidssone)" items={t.geo || []} nameKey="country" valueKey="sessions" color="#14b8a6" />
      </div>
    </div>
  );
}
