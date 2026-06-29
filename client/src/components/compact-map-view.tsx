import "leaflet/dist/leaflet.css";
import { LeafletFarmerMap } from "./leaflet-farmer-map";
import type { Product } from "@shared/schema";

interface CompactMapViewProps {
  products: Product[];
  onFarmerClick?: (farmerId: string) => void;
}

export function CompactMapView({ products, onFarmerClick }: CompactMapViewProps) {
  return (
    <div className="w-full h-full min-h-[280px]">
      <LeafletFarmerMap
        products={products}
        onFarmerClick={onFarmerClick}
        height="100%"
        initialZoom={6}
        center={[52.3, -1.0]}
        showControls={true}
        tileStyle="satellite"
        showLayerSwitcher={true}
      />
    </div>
  );
}
