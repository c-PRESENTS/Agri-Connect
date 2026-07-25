import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation, ZoomIn, ZoomOut, Locate, Search, Filter, User, X, Globe, AlertCircle, Navigation2, Layers, MoreHorizontal, Maximize2, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resolveProductImageForProduct } from "@/lib/product-images";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Product } from "@shared/schema";

interface MapViewProps {
  products: Product[];
  onFarmerClick?: (farmerId: string) => void;
  autoLocate?: boolean;
  compact?: boolean;
}

interface FarmerMarker {
  id: string;
  name: string;
  avatar: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  productCount: number;
  rating: number;
  products: string[];
  location: string;
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function MapView({ products, onFarmerClick, autoLocate = true, compact = false }: MapViewProps) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.7356, 0.4685]); // Chelmsford, UK default
  const [zoom, setZoom] = useState(9);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain' | 'hybrid'>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedMarker, setSelectedMarker] = useState<FarmerMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect location on component mount (only if permissions already granted)
  useEffect(() => {
    if (autoLocate && !hasAutoLocated && "geolocation" in navigator) {
      setHasAutoLocated(true);
      
      // Check if we already have permission before attempting to locate
      if ("permissions" in navigator) {
        navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
          if (result.state === "granted") {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ latitude, longitude });
                setMapCenter([latitude, longitude]);
                setZoom(11);
                setIsLocating(false);
                setLocationError(null);
              },
              () => {
                setIsLocating(false);
              },
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
            );
          }
          // If not granted, don't auto-locate - user can click the button
        }).catch(() => {
          // Permission API not supported, skip auto-locate
        });
      }
    }
  }, [autoLocate, hasAutoLocated]);

  const farmerMarkers: FarmerMarker[] = products.reduce((acc, product) => {
    if (!Number.isFinite(product.farmerLatitude) || !Number.isFinite(product.farmerLongitude)) return acc;
    const farmerName = product.farmerName?.trim() || "Seller not specified";
    const farmerLocation = product.farmerLocation?.trim() || "Location not specified";
    const existing = acc.find((m) => m.id === product.farmerId);
    if (existing) {
      if (!existing.products.includes(product.name)) {
        existing.products.push(product.name);
        existing.productCount++;
      }
    } else {
      const distance = userLocation 
        ? calculateDistance(userLocation.latitude, userLocation.longitude, product.farmerLatitude, product.farmerLongitude)
        : undefined;
      acc.push({
        id: product.farmerId,
        name: farmerName,
        avatar: product.farmerAvatar,
        latitude: product.farmerLatitude,
        longitude: product.farmerLongitude,
        isOnline: Math.random() > 0.3,
        productCount: 1,
        rating: product.farmerRating,
        products: [product.name],
        location: farmerLocation,
        distance,
      });
    }
    return acc;
  }, [] as FarmerMarker[]);

  const filteredMarkers = useMemo(() => {
    return farmerMarkers
      .map(marker => ({
        ...marker,
        distance: userLocation 
          ? calculateDistance(userLocation.latitude, userLocation.longitude, marker.latitude, marker.longitude)
          : marker.distance
      }))
      .filter(marker => {
        if (userLocation && marker.distance !== undefined && marker.distance > radiusKm) return false;
        if (filterOnlineOnly && !marker.isOnline) return false;
        if (filterRating > 0 && marker.rating < filterRating) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = marker.name.toLowerCase().includes(query);
          const matchesProduct = marker.products.some(p => p.toLowerCase().includes(query));
          const matchesLocation = marker.location.toLowerCase().includes(query);
          if (!matchesName && !matchesProduct && !matchesLocation) return false;
        }
        return true;
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [farmerMarkers, userLocation, radiusKm, filterOnlineOnly, filterRating, searchQuery]);

  const handleLocateUser = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!("geolocation" in navigator)) {
      setLocationError(t("map.geolocation_not_supported"));
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setMapCenter([latitude, longitude]);
        setZoom(11);
        setIsLocating(false);
        setLocationError(null);
      },
      (error) => {
        let message = t("map.location_get_failed");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = t("map.location_permission_denied");
            break;
          case error.POSITION_UNAVAILABLE:
            message = t("map.location_unavailable");
            break;
          case error.TIMEOUT:
            message = t("map.location_get_failed");
            break;
        }
        setLocationError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const handleMarkerClick = (marker: FarmerMarker) => {
    setSelectedMarker(selectedMarker?.id === marker.id ? null : marker);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      lat: mapCenter[0],
      lng: mapCenter[1],
    });
  };

  const wrapLongitude = (lng: number): number => {
    let wrapped = lng;
    while (wrapped > 180) wrapped -= 360;
    while (wrapped < -180) wrapped += 360;
    return wrapped;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const scale = 360 / Math.pow(2, zoom + 8);
    const newLat = Math.max(-85, Math.min(85, dragStart.lat + dy * scale));
    const newLng = wrapLongitude(dragStart.lng - dx * scale);
    
    setMapCenter([newLat, newLng]);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setZoom(Math.max(2, Math.min(18, zoom + delta)));
  };

  const latLngToPixel = (lat: number, lng: number): { x: number; y: number } | null => {
    if (!mapContainerRef.current) return null;
    
    const containerWidth = mapContainerRef.current.clientWidth;
    const containerHeight = mapContainerRef.current.clientHeight;
    
    const scale = Math.pow(2, zoom);
    const worldSize = 256 * scale;
    
    const x = ((lng + 180) / 360) * worldSize;
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (worldSize / 2) - (worldSize * mercN / (2 * Math.PI));
    
    const centerX = ((mapCenter[1] + 180) / 360) * worldSize;
    const centerLatRad = mapCenter[0] * Math.PI / 180;
    const centerMercN = Math.log(Math.tan((Math.PI / 4) + (centerLatRad / 2)));
    const centerY = (worldSize / 2) - (worldSize * centerMercN / (2 * Math.PI));
    
    const pixelX = (x - centerX) + (containerWidth / 2);
    const pixelY = (y - centerY) + (containerHeight / 2);
    
    if (pixelX < -50 || pixelX > containerWidth + 50 || pixelY < -50 || pixelY > containerHeight + 50) {
      return null;
    }
    
    return { x: pixelX, y: pixelY };
  };

  const getTileGrid = () => {
    if (!mapContainerRef.current) return [];
    
    const containerWidth = mapContainerRef.current.clientWidth;
    const containerHeight = mapContainerRef.current.clientHeight;
    
    const tiles = [];
    const tileSize = 256;
    const scale = Math.pow(2, zoom);
    
    const centerTileX = ((mapCenter[1] + 180) / 360) * scale;
    const latRad = mapCenter[0] * Math.PI / 180;
    const centerTileY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
    
    const tilesX = Math.ceil(containerWidth / tileSize) + 2;
    const tilesY = Math.ceil(containerHeight / tileSize) + 2;
    
    const offsetX = (centerTileX % 1) * tileSize;
    const offsetY = (centerTileY % 1) * tileSize;
    
    for (let dx = -Math.floor(tilesX / 2); dx <= Math.ceil(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.ceil(tilesY / 2); dy++) {
        let tileX = Math.floor(centerTileX) + dx;
        const tileY = Math.floor(centerTileY) + dy;
        
        while (tileX < 0) tileX += scale;
        while (tileX >= scale) tileX -= scale;
        
        if (tileY >= 0 && tileY < scale) {
          const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
          
          const left = containerWidth / 2 + (dx * tileSize) - offsetX;
          const top = containerHeight / 2 + (dy * tileSize) - offsetY;
          
          tiles.push({
            url,
            left,
            top,
            key: `${zoom}-${dx}-${dy}-${tileX}-${tileY}`,
          });
        }
      }
    }
    return tiles;
  };

  const tiles = getTileGrid();

  const getRadiusPixels = (): number => {
    if (!userLocation || !mapContainerRef.current) return 0;
    
    const metersPerPixel = 156543.03392 * Math.cos(userLocation.latitude * Math.PI / 180) / Math.pow(2, zoom);
    const radiusMeters = radiusKm * 1000;
    return radiusMeters / metersPerPixel;
  };

  // Nearby products list (sorted by distance)
  const nearbyProducts = userLocation ? 
    products
      .map(p => ({
        ...p,
        distance: calculateDistance(userLocation.latitude, userLocation.longitude, p.farmerLatitude, p.farmerLongitude)
      }))
      .filter(p => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8) 
    : [];

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={mapContainerRef} 
        className={`relative flex-1 overflow-hidden transition-all duration-500 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${
          mapType === 'satellite' ? 'bg-[#0b0e14] grayscale-[0.2] contrast-[1.1] brightness-[0.9]' : 
          mapType === 'terrain' ? 'bg-[#f5f5f0] sepia-[0.1]' : 
          'bg-slate-200 dark:bg-slate-800'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          minHeight: compact ? '300px' : '400px',
          backgroundImage: mapType === 'satellite' 
            ? 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")' 
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } as React.CSSProperties}
      >
        <div className={`absolute inset-0 overflow-hidden select-none transition-opacity duration-500 ${mapType === 'satellite' || mapType === 'hybrid' ? 'opacity-30' : 'opacity-100'}`}>
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              className="absolute w-64 h-64 object-cover pointer-events-none"
              style={{
                left: tile.left,
                top: tile.top,
              }}
              loading="lazy"
              draggable={false}
            />
          ))}
        </div>

        {userLocation && (
          <div 
            className="absolute z-15 pointer-events-none"
            style={{
              left: latLngToPixel(userLocation.latitude, userLocation.longitude)?.x ?? 0,
              top: latLngToPixel(userLocation.latitude, userLocation.longitude)?.y ?? 0,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div 
              className="absolute rounded-full border-2 border-blue-500/50 bg-blue-500/15"
              style={{
                width: getRadiusPixels() * 2,
                height: getRadiusPixels() * 2,
                transform: 'translate(-50%, -50%)',
                left: '50%',
                top: '50%',
              }}
            />
            <div className="relative">
              <div className="h-6 w-6 rounded-full bg-blue-600 border-3 border-white shadow-lg flex items-center justify-center">
                <Navigation2 className="h-3 w-3 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-blue-400 animate-ping opacity-75" />
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-10 pointer-events-none">
          {filteredMarkers.map((marker) => {
            const pos = latLngToPixel(marker.latitude, marker.longitude);
            if (!pos) return null;
            
            const isSelected = selectedMarker?.id === marker.id;
            
            return (
              <div
                key={marker.id}
                className="absolute pointer-events-auto"
                style={{ 
                  left: pos.x, 
                  top: pos.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <button
                  className={`relative focus:outline-none focus:ring-2 focus:ring-primary rounded-full transition-all duration-200 ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                  }`}
                  onClick={(e) => { e.stopPropagation(); handleMarkerClick(marker); }}
                  data-testid={`marker-farmer-${marker.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg ${
                    marker.isOnline 
                      ? 'bg-green-500 border-white' 
                      : 'bg-gray-400 border-white'
                  }`}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${
                    marker.isOnline ? 'border-t-green-500' : 'border-t-gray-400'
                  }`} />
                  {marker.isOnline && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-white animate-pulse" />
                  )}
                </button>

                {isSelected && (
                  <Card className="absolute left-1/2 -translate-x-1/2 mt-2 p-2.5 shadow-xl min-w-52 z-50 border bg-background">
                    <button 
                      className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setSelectedMarker(null); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={marker.avatar} alt={marker.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {marker.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm">{marker.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {marker.rating.toFixed(1)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {marker.location}
                        </p>
                        {marker.distance !== undefined && (
                          <p className="text-[11px] text-primary font-medium">
                            {marker.distance.toFixed(1)} {t("map.km_away")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {marker.products.slice(0, 2).map((product, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                              {product.length > 12 ? product.substring(0, 12) + '...' : product}
                            </Badge>
                          ))}
                          {marker.products.length > 2 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              +{marker.products.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-2 h-7 text-xs"
                      onClick={() => onFarmerClick?.(marker.id)}
                      data-testid={`button-view-products-${marker.id}`}
                    >
                      {t("map.view_products")}
                    </Button>
                  </Card>
                )}
              </div>
            );
          })}
        </div>

        {!compact && (
          <div className="absolute top-3 left-3 right-3 z-30 pointer-events-auto">
            <Card className="p-2.5 backdrop-blur-md bg-background/95 shadow-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-32">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("map.search_farmers")}
                    className="pl-8 h-8 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-map-search"
                  />
                </div>
                
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-8">
                      <Filter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">{t("filters.title")}</span>
                      {(filterOnlineOnly || filterRating > 0) && (
                        <Badge variant="default" className="h-4 w-4 p-0 justify-center text-[10px]">
                          {(filterOnlineOnly ? 1 : 0) + (filterRating > 0 ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium">{t("map.radius", { radius: radiusKm })}</Label>
                        <Slider
                          value={[radiusKm]}
                          onValueChange={([value]) => setRadiusKm(value)}
                          min={5}
                          max={200}
                          step={5}
                          className="mt-1.5"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium">{t("map.min_rating")}</Label>
                        <Select value={filterRating.toString()} onValueChange={(v) => setFilterRating(Number(v))}>
                          <SelectTrigger className="mt-1.5 h-8">
                            <SelectValue placeholder={t("filters.any_rating")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{t("map.any_rating")}</SelectItem>
                            <SelectItem value="3">{t("map.stars_3_plus")}</SelectItem>
                            <SelectItem value="4">{t("map.stars_4_plus")}</SelectItem>
                            <SelectItem value="4.5">{t("map.stars_45_plus")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{t("map.online_only")}</Label>
                        <Button
                          variant={filterOnlineOnly ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFilterOnlineOnly(!filterOnlineOnly)}
                        >
                          {filterOnlineOnly ? t("map.on_off_on") : t("map.on_off_off")}
                        </Button>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setFilterRating(0);
                          setFilterOnlineOnly(false);
                          setRadiusKm(50);
                        }}
                      >
                        {t("filters.clear_all")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant={userLocation ? "default" : "outline"}
                  size="sm"
                  onClick={handleLocateUser}
                  disabled={isLocating}
                  className="gap-1 h-8"
                  data-testid="button-locate-public-map"
                >
                  <Locate className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline text-xs">{userLocation ? t("map.located") : t("map.locate")}</span>
                </Button>
              </div>
              
              {locationError && (
                <Alert variant="destructive" className="mt-2 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-[11px]">{locationError}</AlertDescription>
                </Alert>
              )}
            </Card>
          </div>
        )}

        <div className="absolute top-16 right-3 flex flex-col gap-1.5 z-30 pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="shadow-md h-8 w-8">
                <Layers className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("map.style")}</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={mapType === 'standard'} onCheckedChange={() => setMapType('standard')}>
                {t("map.layer_standard")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={mapType === 'satellite'} onCheckedChange={() => setMapType('satellite')}>
                {t("map.layer_satellite")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={mapType === 'terrain'} onCheckedChange={() => setMapType('terrain')}>
                {t("map.layer_terrain")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showTraffic} onCheckedChange={setShowTraffic}>
                {t("map.show_traffic")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showLabels} onCheckedChange={setShowLabels}>
                {t("map.show_labels")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="shadow-md h-8 w-8">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Maximize2 className="h-4 w-4 mr-2" />
                {t("map.full_screen")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MapIcon className="h-4 w-4 mr-2" />
                {t("map.offline_maps")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Globe className="h-4 w-4 mr-2" />
                {t("map.view_3d")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            size="icon" 
            variant="secondary" 
            className="shadow-md h-8 w-8" 
            onClick={() => setZoom(Math.min(zoom + 1, 18))}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="icon" 
            variant="secondary" 
            className="shadow-md h-8 w-8" 
            onClick={() => setZoom(Math.max(zoom - 1, 2))}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          {compact && (
            <Button 
              size="icon" 
              variant={userLocation ? "default" : "secondary"}
              className="shadow-md h-8 w-8" 
              onClick={handleLocateUser}
              disabled={isLocating}
              data-testid="button-locate-compact"
            >
              <Locate className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-auto z-30 pointer-events-auto">
          <Card className="p-2 backdrop-blur-md bg-background/95 shadow-lg">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{filteredMarkers.length} {t("map.farmers_label")}</span>
                {userLocation && <span className="text-muted-foreground">{t("map.in_radius")} {radiusKm}{t("map.km_unit")}</span>}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{t("map.online_status")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-muted-foreground">{t("map.offline_status")}</span>
                </div>
              </div>
              {userLocation && filteredMarkers.length === 0 && (
                <span className="text-muted-foreground" data-testid="located-filter-empty">No public farm locations found within this radius.</span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Nearby Products Section */}
      {userLocation && nearbyProducts.length > 0 && !compact && (
        <div className="border-t bg-muted/30 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {t("map.nearby_products")} ({nearbyProducts.length})
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {nearbyProducts.map((product) => (
              <div 
                key={product.id}
                className="flex-shrink-0 bg-background rounded-lg border p-2 min-w-[140px] hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => onFarmerClick?.(product.farmerId)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={resolveProductImageForProduct(product).src}
                    alt={product.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate">{product.name}</p>
                    <p className="text-[9px] text-muted-foreground">{product.distance.toFixed(1)} km</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary">£{product.price}/{product.unit}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{product.farmerName.split(' ')[0]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
