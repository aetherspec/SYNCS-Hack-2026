import Svg, { Circle, G, Rect } from 'react-native-svg';

// Stylised sandstone facade used to fill the then/now slider and the AR
// camera preview (the design ships empty image-slot placeholders).
// Same geometry both sides so the drag reads as one building changing era.

type SceneColors = {
  sky: string;
  sun: string;
  building: string;
  trim: string;
  window: string;
  ground: string;
  extra?: boolean;
};

function Facade({ c }: { c: SceneColors }) {
  const windows = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      windows.push(
        <Rect
          key={`${row}-${col}`}
          x={120 + col * 56}
          y={150 + row * 62}
          width={30}
          height={42}
          rx={row === 0 ? 15 : 4}
          fill={c.window}
        />
      );
    }
  }
  return (
    <Svg
      viewBox="0 0 560 400"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <Rect width={560} height={400} fill={c.sky} />
      <Circle cx={470} cy={64} r={34} fill={c.sun} />
      {c.extra && (
        <G>
          <Rect x={20} y={60} width={70} height={280} rx={6} fill={c.trim} opacity={0.35} />
          <Rect x={480} y={100} width={60} height={240} rx={6} fill={c.trim} opacity={0.35} />
        </G>
      )}
      {/* clock tower */}
      <Rect x={252} y={30} width={56} height={110} rx={6} fill={c.building} />
      <Circle cx={280} cy={70} r={17} fill={c.sky} />
      <Rect x={278} y={58} width={4} height={13} rx={2} fill={c.trim} />
      {/* main block */}
      <Rect x={100} y={120} width={360} height={230} rx={10} fill={c.building} />
      <Rect x={100} y={120} width={360} height={16} fill={c.trim} />
      {windows}
      {/* columns + door */}
      <Rect x={262} y={220} width={36} height={130} rx={16} fill={c.trim} />
      <Rect x={92} y={340} width={376} height={14} rx={7} fill={c.trim} />
      <Rect width={560} height={50} y={350} fill={c.ground} />
    </Svg>
  );
}

export function PastScene() {
  return (
    <Facade
      c={{
        sky: '#FFF3C4',
        sun: '#F5C15C',
        building: '#8A5A32',
        trim: '#5C3A1E',
        window: '#FFE9A8',
        ground: '#C99B62',
      }}
    />
  );
}

export function NowScene() {
  return (
    <Facade
      c={{
        sky: '#EDEBFF',
        sun: '#C6FF3F',
        building: '#6C3BFF',
        trim: '#101014',
        window: '#DFF6FF',
        ground: '#26262E',
        extra: true,
      }}
    />
  );
}

export function NightScene() {
  return (
    <Facade
      c={{
        sky: '#26262E',
        sun: '#8A8A96',
        building: '#3A3A44',
        trim: '#101014',
        window: '#55555F',
        ground: '#101014',
      }}
    />
  );
}
