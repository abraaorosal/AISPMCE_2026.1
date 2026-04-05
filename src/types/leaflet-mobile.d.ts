import 'leaflet';

declare module 'leaflet' {
  interface MapOptions {
    tap?: boolean | undefined;
  }
}
