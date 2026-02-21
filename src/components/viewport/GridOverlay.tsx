import { Grid } from '@react-three/drei'

export function GridOverlay() {
  return (
    <Grid
      args={[500, 500]}
      cellSize={42}
      cellThickness={0.6}
      cellColor="#404040"
      sectionSize={42 * 3}
      sectionThickness={1}
      sectionColor="#606060"
      fadeDistance={800}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
      position={[0, -0.01, 0]}
    />
  )
}
