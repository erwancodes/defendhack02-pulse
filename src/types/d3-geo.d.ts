declare module 'd3-geo' {
  export function geoConicConformal(): {
    rotate(value: [number, number] | [number, number, number]): ReturnType<typeof geoConicConformal>
    parallels(value: [number, number]): ReturnType<typeof geoConicConformal>
    scale(value: number): ReturnType<typeof geoConicConformal>
    translate(value: [number, number]): ReturnType<typeof geoConicConformal>
    (coordinates: [number, number]): [number, number] | null
  }
}
