declare module 'react-simple-maps' {
  import type { ReactNode, CSSProperties, SVGProps } from 'react';

  type Coords = [number, number];

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export function ComposableMap(props: ComposableMapProps): JSX.Element;

  interface GeographiesProps {
    geography: string | object;
    children: (args: { geographies: Geography[] }) => ReactNode;
  }
  interface Geography {
    rsmKey: string;
    [key: string]: unknown;
  }
  export function Geographies(props: GeographiesProps): JSX.Element;

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: Geography;
    style?: { default?: CSSProperties; hover?: CSSProperties; pressed?: CSSProperties };
  }
  export function Geography(props: GeographyProps): JSX.Element;

  interface MarkerProps extends SVGProps<SVGGElement> {
    coordinates: Coords;
    children?: ReactNode;
  }
  export function Marker(props: MarkerProps): JSX.Element;

  interface LineProps extends SVGProps<SVGPathElement> {
    from: Coords;
    to: Coords;
    className?: string;
  }
  export function Line(props: LineProps): JSX.Element;

  interface SphereProps extends SVGProps<SVGPathElement> {
    id?: string;
  }
  export function Sphere(props: SphereProps): JSX.Element;

  interface GraticuleProps extends SVGProps<SVGPathElement> {}
  export function Graticule(props: GraticuleProps): JSX.Element;

  export function ZoomableGroup(props: { children?: ReactNode; [k: string]: unknown }): JSX.Element;
}
