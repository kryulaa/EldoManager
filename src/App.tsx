import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Bell, Package, LogOut, RefreshCw, ChevronLeft, ChevronRight, Search, AlertCircle, Clock, X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

const GTDCDN_BASE = 'https://andero2003.github.io/GTDCDN';

// --- Types ---

interface NotificationDetail {
  price?: {
    amount: number;
    currency: string;
  };
  detailsId: string;
  title: string;
  buyerUsername: string;
  sellerUsername: string;
  gameId: string;
  gameCategoryTitle: string;
}

interface NotificationItem {
  customNotification?: {
    id: string;
    type: string;
    subject: string;
    text: string;
    redirectUrl: string;
    readStatus: 'IsRead' | 'IsUnread';
    notificationDate: string;
  };
  notification?: {
    id: string;
    type: string;
    event: string;
    notificationReadStatus: 'IsRead' | 'IsUnread';
    recipientRole: string;
    details: NotificationDetail;
    notificationDate: string;
  };
}

interface NotificationsResponse {
  results: NotificationItem[];
  recordCount: number;
  totalPages: number;
  pageIndex: number;
}

interface OfferItem {
  id: string;
  userId: string;
  gameId: string;
  category: string;
  gameCategoryTitle: string;
  gameSeoAlias?: string;
  quantity: number;
  pricePerUnit: {
    amount: number;
    currency: string;
  };
  pricePerUnitInUSD?: {
    amount: number;
    currency: string;
  };
  description?: string;
  guaranteedDeliveryTime?: string;
  offerState: 'Active' | 'Paused' | 'Closed' | 'Offline';
  offerTitle: string;
  mainOfferImage?: string | {
    smallImage: string;
    largeImage: string;
    originalSizeImage?: string;
  };
  offerImages?: {
    smallImage: string;
    largeImage: string;
    originalSizeImage?: string;
  }[];
  imageLocation?: string;
  orderCounts?: {
    last24Hours: number;
    last30Days: number;
    allTime: number;
  };
  pageViewCounts?: {
    currentViewers: number;
    viewsLast24h: number;
  };
  sellerName?: string;
}

interface PredefinedOffer {
  offer: OfferItem;
  user: {
    id: string;
    username: string;
    picture?: {
      smallPicture: string;
    };
  };
}

interface OffersResponse {
  results: OfferItem[];
  recordCount: number;
  totalPages: number;
  pageIndex: number;
}

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/20">
            <Package className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Eldorado Seller</h1>
          <p className="text-zinc-400 text-sm mt-1">Enter your ID Token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              __Host-EldoradoIdToken
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all min-h-[120px] text-sm font-mono"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            Access Dashboard
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-600">
            Your token is stored locally and never shared.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

interface NotificationCardProps {
  item: NotificationItem;
}

const NotificationCard = ({ item }: NotificationCardProps) => {
  const isCustom = !!item.customNotification;
  const readStatus = isCustom ? item.customNotification!.readStatus : item.notification!.notificationReadStatus;
  const isUnread = readStatus === 'IsUnread';
  const notificationDate = isCustom ? item.customNotification!.notificationDate : item.notification!.notificationDate;

  const date = new Date(notificationDate);
  const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getIcon = () => {
    if (isCustom) return <Bell className="w-5 h-5 text-blue-400" />;
    const event = item.notification?.event;
    if (event === 'OrderCreated') return <Package className="w-5 h-5 text-violet-400" />;
    return <Bell className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50",
        isUnread && "border-l-4 border-l-violet-500"
      )}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            {getIcon()}
          </div>
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("text-sm font-semibold truncate", isUnread ? "text-white" : "text-zinc-400")}>
              {isCustom ? item.customNotification!.subject : (item.notification?.event === 'OrderCreated' ? 'New Order Received' : item.notification!.type)}
            </h3>
            <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>
          
          <p className="text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            {isCustom ? item.customNotification!.text : `${item.notification?.details.title} - Buyer: ${item.notification?.details.buyerUsername}`}
          </p>

          {!isCustom && item.notification?.details.price && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                {item.notification.details.price.amount} {item.notification.details.price.currency}
              </span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                {item.notification.details.gameCategoryTitle}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>
    </motion.div>
  );
};

const buildMainOfferImage = (offer: OfferItem): { smallImage: string; largeImage: string; originalSizeImage?: string } | undefined => {
  if (offer.mainOfferImage && typeof offer.mainOfferImage === 'object') return offer.mainOfferImage;
  if (offer.offerImages?.length) return offer.offerImages[0];
  if (typeof offer.mainOfferImage === 'string' && offer.mainOfferImage) {
    return { smallImage: offer.mainOfferImage, largeImage: offer.mainOfferImage };
  }
  if (offer.imageLocation) return { smallImage: offer.imageLocation, largeImage: offer.imageLocation };
  return undefined;
};

const extractImage = (offer: any): string | null => {
  return (
    offer.mainOfferImage?.smallImage ||
    offer.offerImages?.[0]?.smallImage ||
    offer.mainOfferImage?.largeImage ||
    (typeof offer.mainOfferImage === 'string' && offer.mainOfferImage !== 'string' ? offer.mainOfferImage : null) ||
    offer.imageLocation ||
    null
  );
};

// Build all candidate Eldorado CDN URLs for a raw image path/URL.
// Correct format: https://assetsdelivery.eldorado.gg/v7/_offers-v2_/{filename}?w={size}&q=80
const eldoradoImageCandidates = (raw: string, size = 200): string[] => {
  if (raw.startsWith('http')) {
    // Already a full URL — strip any existing transform params and re-apply with our size
    const base = raw.split('?')[0];
    return [`${base}?w=${size}&q=80`, base];
  }
  return [
    `https://assetsdelivery.eldorado.gg/v7/_offers-v2_/${raw}?w=${size}&q=80`,
    `https://assetsdelivery.eldorado.gg/v7/_offers-v2_/${raw}`,
    `https://assetsdelivery.eldorado.gg/v7/${raw}`,
  ];
};

// Fuzzy GTDCDN lookup: exact → strip quantity suffix → partial contains
const lookupCdnImage = (offer: OfferItem, unitImageMap: Map<string, string>): string | null => {
  if (offer.gameId !== '268' || unitImageMap.size === 0) return null;
  const raw = (offer.gameCategoryTitle || offer.offerTitle || '').split(' | ')[0].trim().toLowerCase();
  if (!raw) return null;
  if (unitImageMap.has(raw)) return unitImageMap.get(raw)!;
  // Strip trailing quantity like "x5", "×5", "(5)"
  const stripped = raw.replace(/\s*[\(×x]\s*\d+\)?\s*$/, '').replace(/\s+\d+$/, '').trim();
  if (stripped !== raw && unitImageMap.has(stripped)) return unitImageMap.get(stripped)!;
  // Partial match: unit name contained in offer title or vice-versa
  for (const [name, url] of unitImageMap) {
    if (raw.includes(name) || name.includes(raw)) return url;
  }
  return null;
};

const OfferCard = ({ offer, onClick, onEdit, isUserOffer, cdnImageUrl, onStockUpdate }: {
  offer: OfferItem, onClick?: () => void, onEdit?: () => void,
  isUserOffer?: boolean, cdnImageUrl?: string | null,
  onStockUpdate?: (qty: number) => void,
}) => {
  const [editingStock, setEditingStock] = useState(false);
  const [stockValue, setStockValue] = useState(String(offer.quantity));

  useEffect(() => { setStockValue(String(offer.quantity)); }, [offer.quantity]);
  const buildImageFallbacks = (): string[] => {
    const urls: string[] = [];
    if (cdnImageUrl) urls.push(cdnImageUrl);
    const raw = extractImage(offer);
    if (raw) urls.push(...eldoradoImageCandidates(raw, 200));
    return [...new Set(urls)];
  };

  const imageFallbacks = buildImageFallbacks();
  const primaryImageUrl = imageFallbacks[0] ?? null;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const nextIdx = parseInt(img.dataset.fallbackIdx || '0') + 1;
    if (nextIdx < imageFallbacks.length) {
      img.dataset.fallbackIdx = String(nextIdx);
      img.src = imageFallbacks[nextIdx];
    } else {
      img.onerror = null;
      img.src = 'https://via.placeholder.com/200?text=No+Image';
    }
  };

  const offerUrl = `https://www.eldorado.gg/${offer.gameSeoAlias || 'offers'}/oi/${offer.id}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else {
      window.open(offerUrl, '_blank');
    }
  };

  const displayPrice = offer.pricePerUnitInUSD || offer.pricePerUnit;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group bg-zinc-900 rounded-xl overflow-hidden transition-all hover:shadow-xl cursor-pointer flex flex-col",
        isUserOffer
          ? "border-2 border-violet-500 shadow-lg shadow-violet-500/20 hover:border-violet-400"
          : "border border-zinc-800 hover:border-violet-500/50 hover:shadow-violet-500/5"
      )}
      onClick={handleClick}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        {primaryImageUrl ? (
          <img
            src={primaryImageUrl}
            data-fallback-idx="0"
            alt={offer.offerTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-zinc-800" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md shadow-lg",
            offer.offerState === 'Active' ? "text-green-400 bg-green-500/20 border-green-500/30" :
            offer.offerState === 'Paused' ? "text-amber-400 bg-amber-500/20 border-amber-500/30" :
            offer.offerState === 'Closed' ? "text-red-400 bg-red-500/20 border-red-500/30" :
            "text-zinc-400 bg-zinc-500/20 border-zinc-500/30"
          )}>
            {offer.offerState}
          </span>
        </div>
        {isUserOffer && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-500 text-white uppercase tracking-wider shadow-lg border border-violet-400">
              My Listing
            </span>
          </div>
        )}
      </div>
      
      <div className="p-2 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-violet-400 transition-colors leading-tight min-h-[1.75rem] flex-grow">
            {offer.offerTitle || offer.gameCategoryTitle}
          </h3>
          {offer.sellerName && (
            <span className="text-[8px] font-black text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
              {offer.sellerName}
            </span>
          )}
        </div>
        
        <div className="mt-auto pt-1.5 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Price</span>
              <span className="text-xs font-black text-violet-500">
                ${displayPrice.amount.toFixed(2)} <span className="text-[9px] font-medium text-zinc-500">USD</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Stock</span>
              {editingStock && onStockUpdate ? (
                <input
                  type="number"
                  value={stockValue}
                  autoFocus
                  onChange={(e) => setStockValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const qty = parseInt(stockValue);
                      if (!isNaN(qty) && qty > 0) onStockUpdate(qty);
                      setEditingStock(false);
                    } else if (e.key === 'Escape') {
                      setStockValue(String(offer.quantity));
                      setEditingStock(false);
                    }
                  }}
                  onBlur={() => { setStockValue(String(offer.quantity)); setEditingStock(false); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-14 text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-violet-500/50 rounded px-1 text-right focus:outline-none"
                />
              ) : (
                <div
                  className={cn("text-[10px] font-bold text-zinc-300", onStockUpdate && "cursor-pointer hover:text-violet-400 hover:underline")}
                  onClick={(e) => { if (onStockUpdate) { e.stopPropagation(); setEditingStock(true); } }}
                >
                  {offer.quantity}
                </div>
              )}
            </div>
          </div>
          
          {isUserOffer && onEdit && (
            <div className="mt-1.5 flex items-center justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1 bg-zinc-800 hover:bg-violet-500 text-zinc-400 hover:text-white rounded-md transition-all"
                title="Edit Price"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const EditPriceModal = ({ offer, token, onClose, onUpdate, cdnImageUrl }: {
  offer: OfferItem,
  token: string,
  onClose: () => void,
  onUpdate: (silent?: boolean) => Promise<OfferItem[]>,
  cdnImageUrl?: string | null,
}) => {
  const [localOffer, setLocalOffer] = useState<OfferItem>(offer);
  const initialPrice = (offer.pricePerUnitInUSD || offer.pricePerUnit).amount.toString();
  const [price, setPrice] = useState(initialPrice);
  const [quantity, setQuantity] = useState(offer.quantity.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      const newPrice = parseFloat(price);
      const newQuantity = parseInt(quantity, 10);
      const imageObj = buildMainOfferImage(offer)
        ?? (cdnImageUrl ? { smallImage: cdnImageUrl, largeImage: cdnImageUrl } : undefined);

      // Edit the listing first, then refresh price via the dedicated endpoint if needed.
      await axios.put(`/api/eldorado/offers/${offer.id}/details`, {
        quantity: newQuantity,
        offerTitle: offer.offerTitle || offer.gameCategoryTitle,
        description: offer.description ?? '',
        gameId: offer.gameId,
        category: offer.category,
        currentPrice: newPrice,
        currentCurrency: "USD",
        guaranteedDeliveryTime: offer.guaranteedDeliveryTime,
        mainOfferImage: imageObj,
        offerImages: offer.offerImages,
      }, { headers: { Authorization: token } });

      if (newPrice !== (offer.pricePerUnitInUSD || offer.pricePerUnit).amount) {
        try {
          await axios.put(`/api/eldorado/offers/${offer.id}/change-price`, {
            amount: newPrice,
            currency: "USD"
          }, {
            headers: { Authorization: token }
          });
        } catch (priceErr) {
          console.warn("Price update fallback failed, but listing edit succeeded", priceErr);
        }
      }

      let attempts = 0;
      const poll = async () => {
        attempts++;
        const results = await onUpdate(true); // Call fetchOffers(true)
        const updatedOffer = results?.find((o: any) => o.id === offer.id);

        if (updatedOffer) {
          const currentPrice = updatedOffer.pricePerUnitInUSD?.amount || updatedOffer.pricePerUnit?.amount;
          setLocalOffer(updatedOffer);
          if (currentPrice !== undefined) {
            setLivePrice(currentPrice);
          }

          if (currentPrice === newPrice || attempts >= 5) {
            await onUpdate(); // Final refresh - AWAIT this to ensure parent state is updated
            onClose();
          } else {
            setTimeout(poll, 1500);
          }
        } else {
          setTimeout(poll, 1500);
        }
      };
      setTimeout(poll, 1500);
    } catch (err: any) {
      const status = err.response?.status;
      const d = err.response?.data;
      const msg = d?.error || d?.message || d?.title || (typeof d === 'string' ? d : null);
      if (status === 403) {
        setError(msg || (offer.offerState === 'Closed' || offer.offerState === 'Offline'
          ? `Cannot edit a ${offer.offerState} offer — reactivate it on Eldorado first.`
          : 'Access denied (403) — your token may have expired. Log out and paste a fresh token.'));
      } else {
        setError(msg || `Failed to update price (${status ?? 'unknown error'})`);
      }
      setLoading(false);
    }
  };

  const modalImageFallbacks = (() => {
    const raw = extractImage(localOffer);
    return raw ? eldoradoImageCandidates(raw, 96) : [];
  })();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-black text-white uppercase tracking-tighter">Edit Listing</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800">
               {modalImageFallbacks.length > 0 ? (
                 <img
                   src={modalImageFallbacks[0]}
                   data-fallback-idx="0"
                   alt=""
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                   onError={(e) => {
                     const img = e.target as HTMLImageElement;
                     const next = parseInt(img.dataset.fallbackIdx || '0') + 1;
                     if (next < modalImageFallbacks.length) {
                       img.dataset.fallbackIdx = String(next);
                       img.src = modalImageFallbacks[next];
                     } else { img.onerror = null; }
                   }}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <Package className="w-6 h-6 text-zinc-800" />
                 </div>
               )}
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-bold text-white truncate">{offer.offerTitle}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{offer.gameCategoryTitle}</p>
                {livePrice !== null && (
                  <span className="text-[10px] font-black text-violet-500 animate-pulse">
                    Live: ${livePrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
              <input 
                type="number" 
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Quantity</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-violet-500 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 uppercase tracking-widest text-xs"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MarketPricesModal = ({ offer, onClose, onEdit, unitImageMap }: {
  offer: OfferItem,
  onClose: () => void,
  onEdit: (offer: OfferItem) => void,
  unitImageMap: Map<string, string>
}) => {
  const [marketOffers, setMarketOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState<string>('Flexible');

  const cleanSearchQuery = (title: string) => title.split(' | ')[0].trim();

  const getCdnImageUrl = (o: OfferItem) => lookupCdnImage(o, unitImageMap);

  useEffect(() => {
    const fetchMarketPrices = async () => {
      setLoading(true);
      const query = cleanSearchQuery(offer.offerTitle || offer.gameCategoryTitle || '');
      
      const normalizeResults = (data: any[]): OfferItem[] =>
        data.map((r: any) => ({
          ...(r.offer || r),
          offerTitle: (r.offer?.offerTitle || r.offer?.gameCategoryTitle) || (r.offerTitle || r.gameCategoryTitle),
          offerState: (r.offer?.offerState || r.offerState) || 'Active',
          sellerName: r.user?.username || r.seller?.username || 'Unknown'
        })).sort((a: any, b: any) => {
          const priceA = a.pricePerUnitInUSD?.amount || a.pricePerUnit?.amount || 0;
          const priceB = b.pricePerUnitInUSD?.amount || b.pricePerUnit?.amount || 0;
          return priceA - priceB;
        });

      try {
        try {
          const itemResponse = await axios.get('/api/eldorado/public-item-offers', {
            params: { gameId: offer.gameId, category: offer.category, searchQuery: query, pageSize: 24 }
          });
          if (itemResponse.data.results?.length > 0) {
            setMarketOffers(normalizeResults(itemResponse.data.results));
            setActiveEndpoint('Item Management');
            return;
          }
        } catch (err) {
          console.error('public-item-offers failed:', err);
        }

        try {
          const predefinedResponse = await axios.get('/api/eldorado/predefined-offers', {
            params: { gameId: offer.gameId, category: offer.category, searchQuery: query, pageSize: 24 }
          });
          if (predefinedResponse.data.results) {
            setMarketOffers(normalizeResults(predefinedResponse.data.results));
            setActiveEndpoint('Predefined');
          }
        } catch (err) {
          console.error('predefined-offers failed:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMarketPrices();
  }, [offer]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Market Prices</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                Comparing: <span className="text-violet-500">{offer.offerTitle}</span>
              </p>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                Source: {activeEndpoint}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl aspect-[4/5] animate-pulse" />
              ))}
            </div>
          ) : marketOffers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {marketOffers.map((mOffer) => (
                <div key={mOffer.id}>
                  <OfferCard
                    offer={mOffer}
                    cdnImageUrl={getCdnImageUrl(mOffer)}
                    isUserOffer={mOffer.id === offer.id}
                    onEdit={mOffer.id === offer.id ? () => onEdit(mOffer) : undefined}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest">No other offers found for this item.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── ZeusX Types ─────────────────────────────────────────────────────────────
interface ZXSale {
  offer_id: string;
  offer_code: string;
  title: string;
  listed_price: number; // USD
  offer_status: string; // CREATED | GOOD_DELIVERY | REFUNDED | CANCELED
  cover_photo?: string;
  default_offer_cover_photo?: string;
  slug?: string;
  has_multiple_stock?: boolean;
  quantity?: number;
  is_hidden?: boolean;
  game_id?: string;
  service_category_base_id?: string;
  service_category_name?: string;
  service_category_base_name?: string;
  created_date?: string;
}

// ── ZeusX Sale Card ──────────────────────────────────────────────────────────
const ZXSaleCard = ({ sale, isOwn, onCardClick, onQtyUpdate, onEdit }: {
  sale: ZXSale;
  isOwn?: boolean;
  onCardClick?: () => void;
  onQtyUpdate?: (id: string, qty: number) => Promise<void>;
  onEdit?: () => void;
}) => {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(String(sale.quantity ?? 1));
  useEffect(() => { setQtyValue(String(sale.quantity ?? 1)); }, [sale.quantity]);

  const saveQty = async () => {
    const qty = parseInt(qtyValue);
    if (!isNaN(qty) && qty >= 0 && onQtyUpdate) await onQtyUpdate(sale.offer_id, qty);
    setEditingQty(false);
  };

  const isActive = sale.offer_status === 'CREATED' && !sale.is_hidden;
  const isHidden = sale.offer_status === 'CREATED' && sale.is_hidden;
  const isSold = sale.offer_status === 'GOOD_DELIVERY';
  const statusLabel = isActive ? 'Active' : isHidden ? 'Hidden' : isSold ? 'Sold' : sale.offer_status;
  const statusColor = isActive ? 'text-green-400 bg-green-500/20 border-green-500/30'
    : isHidden ? 'text-amber-400 bg-amber-500/20 border-amber-500/30'
    : isSold ? 'text-zinc-500 bg-zinc-800/50 border-zinc-700/30'
    : 'text-red-400 bg-red-500/20 border-red-500/30';
  const canEdit = sale.offer_status === 'CREATED';
  const photo = sale.cover_photo?.startsWith('http') ? sale.cover_photo
    : sale.cover_photo ? `https://cdn-offer-photos.zeusx.com/${sale.cover_photo}` : null;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }}
      onClick={onCardClick}
      className={cn(
        "group bg-zinc-900 rounded-xl overflow-hidden transition-all flex flex-col",
        onCardClick && "cursor-pointer",
        isOwn ? "border-2 border-violet-500 shadow-lg shadow-violet-500/20 hover:border-violet-400"
              : "border border-zinc-800 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/5"
      )}>
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        {photo ? (
          <img src={photo} alt={sale.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-zinc-800" /></div>
        )}
        <div className="absolute top-2 right-2">
          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md shadow-lg", statusColor)}>
            {statusLabel}
          </span>
        </div>
        {isOwn && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-500 text-white uppercase tracking-wider shadow-lg border border-violet-400">My Listing</span>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col flex-grow">
        <h3 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-violet-400 transition-colors leading-tight mb-1">{sale.title}</h3>
        <div className="mt-auto pt-1.5 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Price</span>
              <span className="text-xs font-black text-violet-500">${sale.listed_price.toFixed(2)} <span className="text-[9px] font-medium text-zinc-500">USD</span></span>
            </div>
            {sale.has_multiple_stock && (
              <div className="text-right">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Stock</span>
                {editingQty && onQtyUpdate ? (
                  <input type="number" autoFocus value={qtyValue}
                    onChange={e => setQtyValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveQty(); else if (e.key === 'Escape') { setQtyValue(String(sale.quantity ?? 1)); setEditingQty(false); } }}
                    onBlur={() => { setQtyValue(String(sale.quantity ?? 1)); setEditingQty(false); }}
                    onClick={e => e.stopPropagation()}
                    className="w-14 text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-violet-500/50 rounded px-1 text-right focus:outline-none" />
                ) : (
                  <div className={cn("text-[10px] font-bold text-zinc-300", canEdit && onQtyUpdate && "cursor-pointer hover:text-violet-400 hover:underline")}
                    onClick={e => { if (canEdit && onQtyUpdate) { e.stopPropagation(); setEditingQty(true); } }}>
                    {sale.quantity ?? 1}
                  </div>
                )}
              </div>
            )}
          </div>
          {isOwn && onEdit && canEdit && (
            <div className="mt-1.5 flex justify-end">
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                className="p-1 bg-zinc-800 hover:bg-violet-500 text-zinc-400 hover:text-white rounded-md transition-all" title="Edit">
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── ZeusX Edit Modal ─────────────────────────────────────────────────────────
const ZXEditModal = ({ sale, token, cfClearance, onClose, onUpdate }: { sale: ZXSale; token: string; cfClearance?: string; onClose: () => void; onUpdate: () => void }) => {
  const [price, setPrice] = useState(String(sale.listed_price.toFixed(2)));
  const [quantity, setQuantity] = useState(String(sale.quantity ?? 1));
  const [loading, setLoading] = useState(false);
  const [fullOffer] = useState<any>(() => {
    const o: any = { ...(sale as any) };
    if (!o.id && o.offer_id) o.id = o.offer_id;
    console.log('[ZX MODAL] sale keys:', Object.keys(o).join(', '));
    console.log('[ZX MODAL] sc_id:', o.service_category_id, '| sc:', o.service_category, '| scb_id:', o.service_category_base_id);
    return o;
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullOffer) { setError('Offer data missing — reopen the modal.'); return; }
    setLoading(true); setError(null);
    try {
      const newPrice = parseFloat(price);
      const newQty = parseInt(quantity);
      const updatedOffer = {
        ...fullOffer,
        ...(!isNaN(newPrice) ? { listed_price: newPrice } : {}),
        ...(sale.has_multiple_stock && !isNaN(newQty) ? { quantity: newQty } : {}),
      };
      if (updatedOffer.listed_price === sale.listed_price && (!sale.has_multiple_stock || updatedOffer.quantity === sale.quantity)) {
        onClose(); return;
      }
      // Send the full offer so the server doesn't need to re-fetch from ZeusX
      const result = await axios.put(`/api/zeusx/offer/${sale.offer_id}`, { _fullOffer: updatedOffer }, { headers: { 'x-zx-token': token, ...(cfClearance ? { 'x-zx-cf': cfClearance } : {}) } });
      if (result.data?.status === 'FAILURE' || result.data?.error) {
        const msg = result.data?.error?.message ?? result.data?.error ?? 'ZeusX returned failure';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      onUpdate(); onClose();
    } catch (e: any) {
      const status = e.response?.status ?? '';
      const raw = e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? 'Update failed';
      const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
      setError(status ? `${status}: ${msg}` : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">Edit Listing</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-zinc-400 text-sm mb-4 truncate">{sale.title}</p>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Price (USD)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" />
          </div>
          {sale.has_multiple_stock && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold transition-all text-sm">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── ZeusX Listing Detail Modal ───────────────────────────────────────────────
const ZXMarketModal = ({ sale, token, userId, onClose, onEdit }: {
  sale: ZXSale; token: string; userId: string; onClose: () => void; onEdit: () => void;
}) => {
  const saleAny = sale as any;
  const photo = saleAny.photos?.[0]?.url ?? saleAny.uploaded_photos?.[0]?.url ?? null;
  const statusColor = sale.offer_status === 'CREATED' && !sale.is_hidden ? 'text-emerald-400' : 'text-zinc-500';
  const statusLabel = sale.is_hidden ? 'Hidden' : sale.offer_status === 'CREATED' ? 'Active' : sale.offer_status;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Listing Details</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 flex gap-4">
          {photo ? (
            <img src={photo} alt="" className="w-28 h-28 object-cover rounded-xl border border-zinc-800 flex-shrink-0" />
          ) : (
            <div className="w-28 h-28 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-8 h-8 text-zinc-700" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{sale.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-zinc-400">Price: <span className="text-white font-bold">${sale.listed_price?.toFixed(2)}</span></span>
              <span className="text-zinc-400">Qty: <span className="text-white font-bold">{sale.quantity ?? (sale as any).qty_avail ?? '—'}</span></span>
              <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
            </div>
            {(sale as any).description && (
              <p className="mt-2 text-[11px] text-zinc-500 line-clamp-3">{(sale as any).description}</p>
            )}
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onEdit}
            className="flex-1 bg-violet-500 hover:bg-violet-600 text-white font-semibold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Listing
          </button>
          <a href={`https://zeusx.com/edit-offer/${sale.offer_id}`} target="_blank" rel="noreferrer"
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-xl transition-all text-sm flex items-center gap-2">
            View on ZeusX
          </a>
        </div>
      </motion.div>
    </div>
  );
};

// ── ZeusX Dashboard ──────────────────────────────────────────────────────────
const ZeusXDashboard = () => {
  const [token, setToken] = useState(() => localStorage.getItem('zx_token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [cfInput, setCfInput] = useState('');
  const [cfClearance, setCfClearance] = useState(() => localStorage.getItem('zx_cf') || '');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState(() => localStorage.getItem('zx_user_id') || '');
  const [tokenExp, setTokenExp] = useState<number | null>(null);
  const [sales, setSales] = useState<ZXSale[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingSale, setEditingSale] = useState<ZXSale | null>(null);
  const [selectedSale, setSelectedSale] = useState<ZXSale | null>(null);
  const [showCfUpdate, setShowCfUpdate] = useState(false);
  const [cfUpdateInput, setCfUpdateInput] = useState('');

  const authHeaders = { 'x-zx-token': token, ...(cfClearance ? { 'x-zx-cf': cfClearance } : {}) };

  const fetchSales = async (tok?: string, page?: number) => {
    setLoading(true); setError(null);
    try {
      const r = await axios.get('/api/zeusx/listings', {
        headers: { 'x-zx-token': tok || token },
        params: { pageIndex: page ?? pageIndex },
      });
      const salesData: ZXSale[] = r.data?.data?.sales ?? [];
      setSales(salesData);
      setTotalRecords(r.data?.data?.pagination?.totalRecords ?? 0);
      if (salesData.length > 0) setPageSize(salesData.length);
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? 'Failed to fetch listings');
    } finally { setLoading(false); }
  };

  const fetchAllSales = async () => {
    setLoading(true); setError(null);
    try {
      const first = await axios.get('/api/zeusx/listings', { headers: { 'x-zx-token': token }, params: { pageIndex: 0 } });
      const total: number = first.data?.data?.pagination?.totalRecords ?? 0;
      const perPage: number = (first.data?.data?.sales ?? []).length || 12;
      const totalPages = Math.ceil(total / perPage);
      const all: ZXSale[] = [...(first.data?.data?.sales ?? [])];
      for (let p = 1; p < totalPages; p++) {
        const r = await axios.get('/api/zeusx/listings', { headers: { 'x-zx-token': token }, params: { pageIndex: p } });
        all.push(...(r.data?.data?.sales ?? []));
      }
      setSales(all);
      setTotalRecords(total);
      setPageIndex(0);
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? 'Failed to fetch all listings');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = tokenInput.trim().replace(/^Bearer\s+/i, '');
    if (!raw) return;
    setLoading(true); setError(null);
    try {
      const r = await axios.get('/api/zeusx/me', { headers: { 'x-zx-token': raw } });
      const { id, exp } = r.data?.data ?? {};
      if (!id) throw new Error('Could not get user ID from token');
      const cf = cfInput.trim();
      setToken(raw);
      setUserId(String(id));
      setTokenExp(exp ?? null);
      localStorage.setItem('zx_token', raw);
      localStorage.setItem('zx_user_id', String(id));
      if (cf) { setCfClearance(cf); localStorage.setItem('zx_cf', cf); }
      setLoggedIn(true);
      await fetchSales(raw);
    } catch (e: any) {
      const raw2 = e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? 'Invalid token';
      setError(typeof raw2 === 'string' ? raw2 : JSON.stringify(raw2));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && userId) { setLoggedIn(true); fetchSales(); }
  }, []);

  const handleQtyUpdate = async (id: string, qty: number) => {
    await axios.put(`/api/zeusx/offer/${id}`, { quantity: qty }, { headers: authHeaders });
    setSales(prev => prev.map(s => s.offer_id === id ? { ...s, quantity: qty } : s));
  };

  const handleLogout = () => {
    setLoggedIn(false); setSales([]); setToken(''); setUserId(''); setCfClearance('');
    localStorage.removeItem('zx_token'); localStorage.removeItem('zx_user_id'); localStorage.removeItem('zx_cf');
  };

  const filtered = sales.filter(s => {
    if (statusFilter === 'active') return s.offer_status === 'CREATED' && !s.is_hidden;
    if (statusFilter === 'hidden') return s.offer_status === 'CREATED' && s.is_hidden;
    if (statusFilter === 'sold') return s.offer_status === 'GOOD_DELIVERY';
    return true;
  });

  const tokenExpDate = tokenExp ? new Date(tokenExp * 1000) : null;
  const tokenExpired = tokenExpDate ? tokenExpDate < new Date() : false;

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/20">
              <Package className="w-8 h-8 text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ZeusX</h1>
            <p className="text-zinc-400 text-sm mt-1">Paste your Bearer token to connect</p>
          </div>
          <div className="mb-5 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs text-zinc-400 space-y-1.5">
            <p className="font-semibold text-zinc-300">How to get your cookies:</p>
            <p>1. Log in to <span className="text-violet-400 font-mono">zeusx.com</span></p>
            <p>2. Open DevTools (<span className="font-mono">F12</span>) → Application → Cookies → <span className="font-mono text-zinc-300">zeusx.com</span></p>
            <p>3. Copy <span className="text-zinc-200 font-semibold">access_token</span> value → paste below as Token</p>
            <p>4. Copy <span className="text-zinc-200 font-semibold">cf_clearance</span> value → paste below as CF Clearance</p>
            <p className="text-zinc-500 pt-1 border-t border-zinc-700">Token expires after ~7 days — paste a fresh one when it stops working.</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs break-all">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">access_token (Bearer Token)</label>
              <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-xs font-mono resize-none" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">cf_clearance <span className="text-zinc-600 normal-case font-normal">(required for editing)</span></label>
              <input value={cfInput} onChange={e => setCfInput(e.target.value)}
                placeholder="Paste cf_clearance cookie value from DevTools → Application → Cookies"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-[11px] font-mono" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20">
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-500" />
            </div>
            <span className="font-bold text-white tracking-tight">ZeusX</span>
            {tokenExpDate && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-mono border",
                tokenExpired ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-zinc-500 bg-zinc-800/50 border-zinc-700/30")}>
                {tokenExpired ? 'Token expired' : `Exp ${tokenExpDate.toLocaleDateString()}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
              {[{ val: 'all', label: 'All' }, { val: 'active', label: 'Active' }, { val: 'hidden', label: 'Hidden' }, { val: 'sold', label: 'Sold' }].map(({ val, label }) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={cn("px-3 py-1.5 text-xs font-medium transition-all", statusFilter === val ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white")}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => { setCfUpdateInput(''); setShowCfUpdate(v => !v); }}
              title="Update cf_clearance cookie"
              className={cn("px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-all",
                cfClearance ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20")}>
              CF {cfClearance ? '✓' : '!'}
            </button>
            <button onClick={() => fetchSales()} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showCfUpdate && (
        <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 sm:px-6 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
            <span className="text-xs text-zinc-400 whitespace-nowrap">cf_clearance:</span>
            <input
              autoFocus
              value={cfUpdateInput}
              onChange={e => setCfUpdateInput(e.target.value)}
              placeholder="Paste new cf_clearance from DevTools → Application → Cookies → zeusx.com"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
            />
            <button
              onClick={() => {
                const v = cfUpdateInput.trim();
                if (!v) return;
                setCfClearance(v);
                localStorage.setItem('zx_cf', v);
                setShowCfUpdate(false);
                setCfUpdateInput('');
              }}
              className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap">
              Save
            </button>
            <button onClick={() => setShowCfUpdate(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-400" />
            <span className="text-white font-bold">{filtered.filter(s => s.offer_status === 'CREATED' && !s.is_hidden).length}</span>
            <span className="text-zinc-500 text-sm">active listings</span>
          </div>
        </div>
        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl aspect-[4/5] animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map(s => (
                <div key={s.offer_id}>
                  <ZXSaleCard sale={s} isOwn onCardClick={() => setSelectedSale(s)} onQtyUpdate={handleQtyUpdate} onEdit={() => setEditingSale(s)} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-zinc-400 font-bold text-lg">No listings found</h3>
          </div>
        )}

        {totalRecords > pageSize && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { const p = pageIndex - 1; setPageIndex(p); fetchSales(undefined, p); }}
                disabled={pageIndex === 0 || loading || sales.length === totalRecords}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-zinc-500 font-medium">
                {sales.length === totalRecords
                  ? <span className="text-zinc-200">{totalRecords} listings loaded</span>
                  : <>Page <span className="text-zinc-200">{pageIndex + 1}</span> of <span className="text-zinc-200">{Math.ceil(totalRecords / pageSize)}</span></>
                }
                <span className="text-zinc-600 ml-2">({totalRecords} total)</span>
              </span>
              <button
                onClick={() => { const p = pageIndex + 1; setPageIndex(p); fetchSales(undefined, p); }}
                disabled={pageIndex >= Math.ceil(totalRecords / pageSize) - 1 || loading || sales.length === totalRecords}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {sales.length < totalRecords && (
              <button
                onClick={fetchAllSales}
                disabled={loading}
                className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors underline underline-offset-2"
              >
                Load all {totalRecords} listings
              </button>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {editingSale && (
          <ZXEditModal sale={editingSale} token={token} cfClearance={cfClearance} onClose={() => setEditingSale(null)} onUpdate={fetchSales} />
        )}
        {selectedSale && !editingSale && (
          <ZXMarketModal sale={selectedSale} token={token} userId={userId}
            onClose={() => setSelectedSale(null)}
            onEdit={() => { setEditingSale(selectedSale); setSelectedSale(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Gameflip Types ──────────────────────────────────────────────────────────
interface GFPhoto {
  status: 'pending' | 'active' | 'deleted';
  display_order?: number;
  view_url?: string;
}

interface GFListing {
  id: string;
  name: string;
  description?: string;
  price: number; // cents USD
  shipping_fee?: number;
  qty_avail?: number;
  qty_sold?: number;
  status: 'prepare' | 'ready' | 'onsale' | 'sold' | 'cancelled';
  category?: string;
  platform?: string;
  condition?: string;
  digital?: boolean;
  digital_deliverable?: string;
  upc?: string;
  cover_photo?: string;
  photo?: Record<string, GFPhoto>; // keyed by photo ID
  tags?: string[];
  owner?: string;
  version: string;
  created?: string;
  updated?: string;
}

interface GFWallet {
  balance?: number;
  cash_balance?: number;
  gbux_balance?: number;
  held_cash_balance?: number;
}

// ── Gameflip Edit Modal ─────────────────────────────────────────────────────
const GFEditModal = ({ listing, gfKey, gfSecret, onClose, onUpdate }: {
  listing: GFListing;
  gfKey: string;
  gfSecret: string;
  onClose: () => void;
  onUpdate: () => void;
}) => {
  const [price, setPrice] = useState(String((listing.price / 100).toFixed(2)));
  const [quantity, setQuantity] = useState(String(listing.qty_avail ?? 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const ops: { op: string; path: string; value: any }[] = [];
      const newPrice = Math.round(parseFloat(price) * 100);
      if (newPrice !== listing.price) ops.push({ op: 'replace', path: '/price', value: newPrice });
      const newQty = parseInt(quantity);
      if (!isNaN(newQty) && newQty !== listing.qty_avail) ops.push({ op: 'replace', path: '/qty_avail', value: newQty });
      if (ops.length === 0) { onClose(); return; }
      await axios.patch(`/api/gameflip/listing/${listing.id}`, ops, {
        headers: { 'x-gf-key': gfKey, 'x-gf-secret': gfSecret, 'x-gf-version': String(listing.version) },
      });
      onUpdate();
      onClose();
    } catch (e: any) {
      const d = e.response?.data;
      const raw = d?.error?.message ?? d?.message ?? d?.error ?? e.message ?? 'Update failed';
      setError(typeof raw === 'string' ? raw : JSON.stringify(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">Edit Listing</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-zinc-400 text-sm mb-4 truncate">{listing.name}</p>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Price (USD)</label>
            <input type="number" step="0.01" min="0.75" max="2500" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Quantity</label>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold transition-all text-sm">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Gameflip Listing Card ───────────────────────────────────────────────────
const GFListingCard = ({ listing, isOwn, onCardClick, onQtyUpdate, onEdit }: {
  listing: GFListing;
  isOwn?: boolean;
  onCardClick?: () => void;
  onQtyUpdate?: (id: string, qty: number) => Promise<void>;
  onEdit?: () => void;
}) => {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(String(listing.qty_avail ?? 1));

  useEffect(() => { setQtyValue(String(listing.qty_avail ?? 1)); }, [listing.qty_avail]);

  const saveQty = async () => {
    const qty = parseInt(qtyValue);
    if (!isNaN(qty) && qty >= 0 && onQtyUpdate) await onQtyUpdate(listing.id, qty);
    setEditingQty(false);
  };

  const photo = (() => {
    if (!listing.photo) return null;
    const photos = Object.entries(listing.photo);
    if (listing.cover_photo && listing.photo[listing.cover_photo]?.view_url)
      return listing.photo[listing.cover_photo].view_url;
    const active = photos
      .filter(([, p]) => p.status === 'active' && p.view_url)
      .sort(([, a], [, b]) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return active[0]?.[1].view_url ?? null;
  })();

  const priceUSD = (listing.price / 100).toFixed(2);
  const statusColor = listing.status === 'onsale'
    ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : listing.status === 'sold'
      ? 'text-zinc-500 bg-zinc-800/50 border-zinc-700/30'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  const canEdit = listing.status === 'onsale' || listing.status === 'ready';

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }}
      onClick={onCardClick}
      className={cn(
        "group bg-zinc-900 rounded-xl overflow-hidden transition-all flex flex-col",
        onCardClick && "cursor-pointer",
        isOwn
          ? "border-2 border-violet-500 shadow-lg shadow-violet-500/20 hover:border-violet-400"
          : "border border-zinc-800 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/5"
      )}>
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        {photo ? (
          <img src={photo} alt={listing.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-zinc-700" /></div>
        )}
        <div className="absolute top-2 right-2">
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md", statusColor)}>
            {listing.status === 'onsale' ? 'On Sale' : listing.status}
          </span>
        </div>
        {isOwn && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-500 text-white uppercase tracking-wider shadow-lg border border-violet-400">
              My Listing
            </span>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col flex-grow">
        <p className="text-white text-[11px] font-bold leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors mb-1">{listing.name}</p>
        <div className="mt-auto pt-1.5 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Price</span>
              <span className="text-xs font-black text-violet-500">${priceUSD} <span className="text-[9px] font-medium text-zinc-500">USD</span></span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Stock</span>
              {editingQty && onQtyUpdate ? (
                <input
                  type="number" autoFocus value={qtyValue}
                  onChange={e => setQtyValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveQty();
                    else if (e.key === 'Escape') { setQtyValue(String(listing.qty_avail ?? 1)); setEditingQty(false); }
                  }}
                  onBlur={() => { setQtyValue(String(listing.qty_avail ?? 1)); setEditingQty(false); }}
                  onClick={e => e.stopPropagation()}
                  className="w-14 text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-violet-500/50 rounded px-1 text-right focus:outline-none"
                />
              ) : (
                <div
                  className={cn("text-[10px] font-bold text-zinc-300", canEdit && onQtyUpdate && "cursor-pointer hover:text-violet-400 hover:underline")}
                  onClick={e => { if (canEdit && onQtyUpdate) { e.stopPropagation(); setEditingQty(true); } }}
                >
                  {listing.qty_avail ?? 1}
                </div>
              )}
            </div>
          </div>
          {isOwn && onEdit && canEdit && (
            <div className="mt-1.5 flex justify-end">
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                className="p-1 bg-zinc-800 hover:bg-violet-500 text-zinc-400 hover:text-white rounded-md transition-all" title="Edit Price">
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Gameflip Market Prices Modal ────────────────────────────────────────────
const GFMarketModal = ({ listing, gfKey, gfSecret, gfUserId, onClose, onEdit }: {
  listing: GFListing;
  gfKey: string;
  gfSecret: string;
  gfUserId: string;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const [results, setResults] = useState<GFListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await axios.get('/api/gameflip/search', {
          headers: { 'x-gf-key': gfKey, 'x-gf-secret': gfSecret },
          params: { status: 'onsale', limit: 100, sort: 'price:asc', name: listing.name },
        });
        const raw = r.data?.data;
        const items: GFListing[] = Array.isArray(raw) ? raw : (raw?.listings ?? []);
        setResults(items.sort((a, b) => a.price - b.price));
      } catch { setResults([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [listing.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Market Prices</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Comparing: <span className="text-violet-400 normal-case font-semibold">{listing.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl aspect-[4/5] animate-pulse" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {results.map(r => (
                <div key={r.id}>
                  <GFListingCard
                    listing={r}
                    isOwn={r.owner === gfUserId}
                    onEdit={r.owner === gfUserId ? onEdit : undefined}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest">No other listings found.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Gameflip Dashboard ──────────────────────────────────────────────────────
const GameflipDashboard = () => {
  const [gfKey, setGfKey] = useState(() => localStorage.getItem('gf_key') || '');
  const [gfSecret, setGfSecret] = useState(() => localStorage.getItem('gf_secret') || '');
  const [loggedIn, setLoggedIn] = useState(false);
  const [listings, setListings] = useState<GFListing[]>([]);
  const [wallet, setWallet] = useState<GFWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<GFListing | null>(null);
  const [selectedListing, setSelectedListing] = useState<GFListing | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gfUserId, setGfUserId] = useState(() => localStorage.getItem('gf_user_id') || '');

  const gfCreds = { headers: { 'x-gf-key': gfKey, 'x-gf-secret': gfSecret } };

  const fetchListings = async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const owner = userId || gfUserId;
      const params: any = { owner, limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [listRes, walletRes] = await Promise.all([
        axios.get('/api/gameflip/listings', { ...gfCreds, params }),
        axios.get('/api/gameflip/wallet', gfCreds),
      ]);
      const raw = listRes.data.data;
      setListings(Array.isArray(raw) ? raw : (raw?.listings ?? []));
      setWallet(walletRes.data.data || null);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || 'Failed to fetch listings.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const meRes = await axios.get('/api/gameflip/me', gfCreds);
      const d = meRes.data?.data ?? meRes.data;
      const userId = d?.owner || d?.id || d?.profile?.owner || d?.profile?.id;
      if (!userId) throw new Error(`Could not get account ID. API returned: ${JSON.stringify(meRes.data).slice(0, 300)}`);
      setGfUserId(userId);
      localStorage.setItem('gf_key', gfKey);
      localStorage.setItem('gf_secret', gfSecret);
      localStorage.setItem('gf_user_id', userId);
      setLoggedIn(true);
      await fetchListings(userId);
    } catch (e: any) {
      const raw = e.response?.data?.error?.message ?? e.response?.data?.message ?? e.response?.data?.error ?? e.response?.data ?? e.message ?? 'Check your API key and OTP secret.';
      const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
      setError(msg);
      setLoggedIn(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gfKey && gfSecret && gfUserId) { setLoggedIn(true); fetchListings(gfUserId); }
  }, []);

  useEffect(() => {
    if (loggedIn && gfUserId) fetchListings();
  }, [statusFilter]);

  const handleQtyUpdate = async (listingId: string, newQty: number) => {
    await axios.patch(`/api/gameflip/listing/${listingId}`,
      [{ op: 'replace', path: '/qty_avail', value: newQty }],
      { headers: { 'x-gf-key': gfKey, 'x-gf-secret': gfSecret } }
    );
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, qty_avail: newQty } : l));
  };

  const handleLogout = () => {
    setLoggedIn(false); setListings([]); setWallet(null);
    localStorage.removeItem('gf_key'); localStorage.removeItem('gf_secret'); localStorage.removeItem('gf_user_id');
    setGfKey(''); setGfSecret(''); setGfUserId('');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/20">
              <Package className="w-8 h-8 text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Gameflip</h1>
            <p className="text-zinc-400 text-sm mt-1">Enter your API credentials</p>
          </div>

          <div className="mb-5 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs text-zinc-400 space-y-1.5">
            <p className="font-semibold text-zinc-300">Where to find your credentials:</p>
            <p>1. Go to <span className="text-violet-400 font-mono">gameflip.com/settings</span> → API section</p>
            <p>2. Your <span className="text-zinc-200 font-semibold">API Key</span> is always visible there</p>
            <p>3. Your <span className="text-zinc-200 font-semibold">OTP Secret</span> was shown <span className="text-yellow-400">only once</span> when you first created API access — if you saved it, paste it below</p>
            <p className="text-zinc-500 pt-1 border-t border-zinc-700">If you lost your OTP Secret, go to settings → API → <span className="text-zinc-400">regenerate</span> to get a new one (the new OTP Secret will be shown once again).</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono break-all whitespace-pre-wrap max-h-40 overflow-y-auto">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">API Key</label>
              <input value={gfKey} onChange={e => setGfKey(e.target.value)} placeholder="e.g. abc123..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm font-mono" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">OTP Secret <span className="text-yellow-500/70 normal-case">(shown only once at creation)</span></label>
              <input value={gfSecret} onChange={e => setGfSecret(e.target.value)} placeholder="e.g. JBSWY3DPEHPK3PXP..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm font-mono" required />
              <p className="text-xs text-zinc-600 mt-1">Base32 string — NOT your 2FA authenticator code</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20">
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const activeCount = listings.filter(l => l.status === 'onsale').length;
  const cashBalance = wallet?.cash_balance != null ? (wallet.cash_balance / 100).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-500" />
            </div>
            <span className="font-bold text-white tracking-tight">Gameflip</span>
            {cashBalance && (
              <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-mono">${cashBalance}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
              {[
                { val: 'all', label: 'All' },
                { val: 'onsale', label: 'On Sale' },
                { val: 'ready', label: 'Ready' },
                { val: 'sold', label: 'Sold' },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={cn("px-3 py-1.5 text-xs font-medium transition-all",
                    statusFilter === val ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white")}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => fetchListings()} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-400" />
            <span className="text-white font-bold">{activeCount}</span>
            <span className="text-zinc-500 text-sm">active listings</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {listings.map(l => (
                <div key={l.id}>
                  <GFListingCard
                    listing={l}
                    isOwn
                    onCardClick={() => setSelectedListing(l)}
                    onQtyUpdate={handleQtyUpdate}
                    onEdit={() => setEditingListing(l)}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-zinc-400 font-bold text-lg">No listings found</h3>
          </div>
        )}
      </main>

      <AnimatePresence>
        {editingListing && (
          <GFEditModal
            listing={editingListing}
            gfKey={gfKey}
            gfSecret={gfSecret}
            onClose={() => setEditingListing(null)}
            onUpdate={fetchListings}
          />
        )}
        {selectedListing && !editingListing && (
          <GFMarketModal
            listing={selectedListing}
            gfKey={gfKey}
            gfSecret={gfSecret}
            gfUserId={gfUserId}
            onClose={() => setSelectedListing(null)}
            onEdit={() => { setEditingListing(selectedListing); setSelectedListing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── G2G Types ─────────────────────────────────────────────────────────────────
interface G2GOffer {
  offer_id: string;
  seller_id?: string;
  title?: string;
  description?: string;
  status?: 'live' | 'delisted' | 'requires_modification' | string;
  unit_price?: number;
  currency?: string;
  offer_currency?: string;
  unit_price_in_usd?: number;
  converted_unit_price?: number;
  display_price?: string;
  available_qty?: number;
  actual_qty?: number;       // sls GET field — real stock for manual delivery offers
  qty?: number;              // sls PATCH field name
  api_qty?: number;
  min_qty?: number;
  low_stock_alert_qty?: number;
  cat_id?: string;
  brand_id?: string;
  service_id?: string;
  delivery_mode?: string[];
  delivery_speed?: string;
  delivery_method_ids?: string[];
  delivery_speed_details?: { min: number; max: number; delivery_time: number }[];
  sales_territory_settings?: { settings_type: string; countries: string[] };
  package_settings?: any[];
  other_pricing?: any[];
  wholesale_details?: any[];
  other_wholesale_details?: any[];
  // sls.g2g.com image / attribute fields
  primary_img_attributes?: string[];
  offer_title_collection_tree?: string[];
  offer_attributes?: { collection_id: string; dataset_id: string }[];
  username?: string;
  created_at?: number;
  updated_at?: number;
}

// ── G2G Market Modal (competitor prices) ─────────────────────────────────────
const G2GMarketModal = ({ offer, sellerId, g2gKey, g2gSecret, g2gJwt, onClose, onEdit }: {
  offer: G2GOffer; sellerId: string; g2gKey: string; g2gSecret: string; g2gJwt: string;
  onClose: () => void; onEdit: () => void;
}) => {
  const [competitors, setCompetitors] = useState<G2GOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

    const search = (attrs: any[]) => {
      const params: any = {};
      if (attrs && attrs.length > 0) {
        const cid = attrs[0].collection_id ?? attrs[0].attribute_group_id;
        const did = attrs[0].dataset_id ?? attrs[0].attribute_id;
        if (cid && did) params.fa = `${cid}:${did}`;
      }
      if (!params.fa) {
        const tree = offer.offer_title_collection_tree;
        if (tree?.length) params.fa = tree[0];
      }
      if (offer.title) params.q = offer.title.split(' | ')[0].trim();
      if (offer.brand_id) params.brand_id = offer.brand_id;
      if ((offer as any).service_id) params.service_id = (offer as any).service_id;
      if ((offer as any).cat_id) params.cat_id = (offer as any).cat_id;
      // derive country from offer currency so sls.g2g.com returns the right market
      const currencyToCountry: Record<string, string> = {
        PHP: 'PH', USD: 'US', SGD: 'SG', MYR: 'MY', AUD: 'AU', EUR: 'DE', GBP: 'GB', THB: 'TH', IDR: 'ID',
      };
      const offerCurrency = (offer.offer_currency ?? offer.currency ?? 'USD').toUpperCase();
      params.currency = offerCurrency;
      params.country = currencyToCountry[offerCurrency] ?? 'US';
      if (!params.fa && !params.q) { setLoading(false); setError('Not enough data to search market'); return; }
      const headers: any = {};
      if (g2gJwt) headers['x-g2g-jwt'] = g2gJwt;
      axios.get('/api/g2g/market', { params, headers })
        .then(r => {
          const results: G2GOffer[] = r.data?.payload?.results ?? [];
          setCompetitors(results.sort((a, b) => (a.unit_price ?? 0) - (b.unit_price ?? 0)));
        })
        .catch(e => setError(e.response?.data?.error ?? 'Failed to load market prices'))
        .finally(() => setLoading(false));
    };

    // offer_attributes not included in list responses — fetch individual offer to get them
    const existingAttrs = offer.offer_attributes as any[];
    const hasAttrs = existingAttrs?.length > 0
      && (existingAttrs[0].collection_id || existingAttrs[0].attribute_group_id);

    if (hasAttrs) {
      search(existingAttrs);
    } else {
      axios.get(`/api/g2g/offer/${offer.offer_id}`, {
        headers: { 'x-g2g-key': g2gKey, 'x-g2g-secret': g2gSecret, 'x-g2g-user': sellerId },
      }).then(r => {
        search((r.data?.payload ?? r.data)?.offer_attributes ?? []);
      }).catch(() => search([]));
    }
  }, []);

  const cur = offer.offer_currency ?? offer.currency ?? 'USD';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h2 className="text-base font-bold text-white">Market Prices</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">{offer.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-semibold bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-all">Edit My Price</button>
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse"/>)}</div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-10">{error}</p>
          ) : competitors.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">No other listings found</p>
          ) : (
            <div className="space-y-2">
              {competitors.map((c, i) => {
                const isMe = c.seller_id === sellerId || c.username === 'KrayonStore';
                const cCur = c.offer_currency ?? c.currency ?? cur;
                return (
                  <div key={c.offer_id} className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border",
                    isMe ? "bg-violet-500/10 border-violet-500/30" : "bg-zinc-900 border-zinc-800"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-zinc-500 w-5 text-right flex-shrink-0">#{i+1}</span>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-semibold truncate", isMe ? "text-violet-400" : "text-zinc-300")}>
                          {c.username ?? c.seller_id ?? 'Seller'} {isMe && <span className="text-[10px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full ml-1">YOU</span>}
                        </p>
                        <p className="text-[10px] text-zinc-600">{c.api_qty ?? c.available_qty ?? 0} in stock</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("text-sm font-black", isMe ? "text-violet-400" : "text-white")}>{cCur} {(c.unit_price ?? 0).toLocaleString()}</p>
                      {c.display_price && <p className="text-[10px] text-zinc-500">≈ ${c.display_price}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── G2G Edit Modal ────────────────────────────────────────────────────────────
const G2GEditModal = ({ offer, g2gKey, g2gSecret, g2gUser, onClose, onUpdate }: {
  offer: G2GOffer; g2gKey: string; g2gSecret: string; g2gUser: string;
  onClose: () => void; onUpdate: () => void;
}) => {
  const [price, setPrice] = useState(String(offer.unit_price ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cur = offer.offer_currency ?? offer.currency ?? 'PHP';
  const apiHeaders = { 'x-g2g-key': g2gKey, 'x-g2g-secret': g2gSecret, 'x-g2g-user': g2gUser };

  const isManualOffer = (offer as any).delivery_speed === 'manual'
    || (offer as any).delivery_type?.includes('face_to_face_trade')
    || (offer as any).delivery_mode?.includes('face_to_face_trade');

  const g2gEditUrl = `https://www.g2g.com/offers/${offer.offer_id}/edit`;

  const handleSave = async () => {
    setLoading(true); setError(null);
    try {
      const newPrice = parseFloat(price);
      if (isNaN(newPrice)) { setError('Invalid price'); setLoading(false); return; }
      const r = await axios.patch(`/api/g2g/offer/${offer.offer_id}`, { unit_price: newPrice }, { headers: apiHeaders });
      const code = r.data?.code;
      if (code && code !== 2000 && code !== '2000' && code !== 20000001 && code !== '20000001') {
        throw new Error(r.data?.message ?? JSON.stringify(r.data));
      }
      onUpdate(); onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? 'Update failed';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">Edit G2G Offer</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-zinc-400 text-sm mb-4 truncate">{offer.title || offer.offer_id}</p>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm break-all">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Unit Price ({cur})</label>
            <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all" />
          </div>
          {isManualOffer && (
            <div className="p-3 bg-zinc-800/60 border border-zinc-700 rounded-xl">
              <p className="text-xs text-zinc-400 mb-2">Stock quantity must be updated on G2G directly (API limitation for manual delivery offers).</p>
              <a href={g2gEditUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                Open My Offers on G2G →
              </a>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold transition-all text-sm">
            {loading ? 'Saving…' : 'Save Price'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── G2G Offer Card ────────────────────────────────────────────────────────────
function g2gImageUrl(offer: G2GOffer): string | null {
  const attrId = offer.primary_img_attributes?.[0] ?? offer.offer_title_collection_tree?.[1];
  if (attrId) return `https://assets.g2g.com/offer_title_collection/${attrId}.png`;
  if (offer.brand_id) return `https://assets.g2g.com/brand/${offer.brand_id}.jpg`;
  return null;
}

const G2GOfferCard = ({ offer, onEdit, onMarket }: { offer: G2GOffer; onEdit: () => void; onMarket: () => void }) => {
  const [imgErr, setImgErr] = useState(false);
  const imgUrl = imgErr ? null : g2gImageUrl(offer);
  const cur = offer.offer_currency ?? offer.currency ?? 'USD';
  const price = offer.unit_price ?? 0;
  const usdPrice = offer.display_price ?? (offer.unit_price_in_usd ? offer.unit_price_in_usd.toFixed(2) : null);
  const qty = offer.api_qty ?? offer.available_qty ?? 0;
  const statusColor = offer.status === 'live'
    ? 'text-green-400 bg-green-500/20 border-green-500/30'
    : offer.status === 'delisted'
    ? 'text-zinc-500 bg-zinc-800/50 border-zinc-700/30'
    : 'text-amber-400 bg-amber-500/20 border-amber-500/30';

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }}
      className="group bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 rounded-xl overflow-hidden transition-all flex flex-col cursor-pointer"
      onClick={onMarket}>
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        {imgUrl ? (
          <img src={imgUrl} alt={offer.title} onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-zinc-800" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md shadow-lg", statusColor)}>
            {offer.status ?? 'live'}
          </span>
        </div>
        <div className="absolute top-2 left-2">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1 bg-zinc-800/80 hover:bg-violet-500 text-zinc-400 hover:text-white rounded-md transition-all backdrop-blur-sm" title="Edit price/qty">
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      <div className="p-2 flex flex-col flex-grow">
        <h3 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-violet-400 transition-colors leading-tight mb-1">
          {offer.title || offer.offer_id}
        </h3>
        <div className="mt-auto pt-1.5 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Price</span>
              <span className="text-xs font-black text-violet-500">{cur} {price.toLocaleString()}</span>
              {usdPrice && <span className="text-[9px] text-zinc-500">≈ ${usdPrice}</span>}
            </div>
            <div className="text-right">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Stock</span>
              <div className="text-[10px] font-bold text-zinc-300">{qty.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── G2G Dashboard ─────────────────────────────────────────────────────────────
const G2GDashboard = () => {
  const [g2gKey, setG2gKey] = useState(() => localStorage.getItem('g2g_key') || '');
  const [g2gSecret, setG2gSecret] = useState(() => localStorage.getItem('g2g_secret') || '');
  const [g2gUser, setG2gUser] = useState(() => localStorage.getItem('g2g_user') || '');
  const [g2gJwt, setG2gJwt] = useState(() => localStorage.getItem('g2g_jwt') || '');
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [offers, setOffers] = useState<G2GOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOffer, setEditingOffer] = useState<G2GOffer | null>(null);
  const [marketOffer, setMarketOffer] = useState<G2GOffer | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showJwtInput, setShowJwtInput] = useState(false);
  const [jwtInputVal, setJwtInputVal] = useState('');

  const fetchOffers = async (p = 1, userOverride?: string) => {
    setLoading(true); setError(null);
    const hdrs = { 'x-g2g-key': g2gKey, 'x-g2g-secret': g2gSecret, 'x-g2g-user': userOverride ?? g2gUser };
    try {
      const r = await axios.get('/api/g2g/offers', { headers: hdrs, params: { page: p, page_size: 50 } });
      const payload = r.data?.payload;
      // sls.g2g.com returns { payload: { results: [...], total_result: N } }
      const list: G2GOffer[] = Array.isArray(payload?.results) ? payload.results
        : Array.isArray(payload) ? payload
        : [];
      // Auto-capture seller_id from first offer if we don't have it yet
      if (!g2gUser && list.length > 0 && list[0].seller_id) {
        const sid = list[0].seller_id;
        setG2gUser(sid);
        localStorage.setItem('g2g_user', sid);
      }
      const total: number = payload?.total_result ?? payload?.max_total_result ?? 0;
      if (p === 1) setOffers(list); else setOffers(prev => [...prev, ...list]);
      setHasMore(list.length > 0 && (p * 48) < total);
      setPage(p);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? 'Failed to fetch offers';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim(); const secret = secretInput.trim(); const user = userInput.trim();
    if (!key || !secret) return;
    setLoading(true); setError(null);
    try {
      const r = await axios.get('/api/g2g/me', { headers: { 'x-g2g-key': key, 'x-g2g-secret': secret, 'x-g2g-user': user } });
      const userId: string = user || r.data?.payload?.seller_id || r.data?.payload?.user_id || '';
      setG2gKey(key); setG2gSecret(secret); setG2gUser(userId);
      localStorage.setItem('g2g_key', key);
      localStorage.setItem('g2g_secret', secret);
      localStorage.setItem('g2g_user', userId);
      setLoggedIn(true);
      await fetchOffers(1, userId);
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? 'Invalid credentials');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (g2gKey && g2gSecret) { setLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (loggedIn && g2gKey) fetchOffers();
  }, [loggedIn]);

  const handleLogout = () => {
    setLoggedIn(false); setOffers([]); setG2gKey(''); setG2gSecret(''); setG2gUser('');
    localStorage.removeItem('g2g_key'); localStorage.removeItem('g2g_secret'); localStorage.removeItem('g2g_user');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4 border border-violet-500/20 mx-auto">
              <Package className="w-8 h-8 text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">G2G</h1>
            <p className="text-zinc-400 text-sm mt-1">Enter your Seller API credentials</p>
          </div>
          <div className="mb-5 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs text-zinc-400 space-y-1.5">
            <p className="font-semibold text-zinc-300">Where to find credentials:</p>
            <p>Go to <span className="text-violet-400 font-mono">g2g.com</span> → Seller Hub → API Settings</p>
            <p><span className="text-zinc-200 font-semibold">Account ID</span> is shown on that same page (numeric ID)</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">API Key</label>
              <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Your G2G API key"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm font-mono" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">API Secret</label>
              <input type="password" value={secretInput} onChange={e => setSecretInput(e.target.value)} placeholder="Your G2G API secret"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm font-mono" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Account ID</label>
              <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Numeric account ID from API Settings"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm font-mono" />
              <p className="text-xs text-zinc-600 mt-1">Optional — helps filter your offers</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20">
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-500" />
            </div>
            <span className="font-bold text-white tracking-tight">G2G</span>
            <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-mono">{offers.length} offers</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setJwtInputVal(''); setShowJwtInput(v => !v); }}
              title="Paste G2G session JWT to enable market price search"
              className={cn("px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-all",
                g2gJwt ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20")}>
              JWT {g2gJwt ? '✓' : '?'}
            </button>
            <button onClick={() => fetchOffers(1)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showJwtInput && (
        <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 sm:px-6 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
            <span className="text-xs text-zinc-400 whitespace-nowrap">G2G JWT:</span>
            <input autoFocus value={jwtInputVal} onChange={e => setJwtInputVal(e.target.value)}
              placeholder="Log in to g2g.com → F12 → Application → Cookies → copy 'jwt' or 'Authorization' value"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
            <button onClick={() => {
              const v = jwtInputVal.trim();
              if (!v) return;
              setG2gJwt(v); localStorage.setItem('g2g_jwt', v);
              setShowJwtInput(false); setJwtInputVal('');
            }} className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap">Save</button>
            <button onClick={() => setShowJwtInput(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 max-w-screen-2xl mx-auto">Required for market price search in region-locked categories (e.g. Roblox PHP listings). Get it from: g2g.com DevTools → Application → Cookies → <span className="font-mono">jwt</span></p>
        </div>
      )}

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        {loading && offers.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No offers found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {offers.map(o => (
                <G2GOfferCard key={o.offer_id} offer={o} onEdit={() => setEditingOffer(o)} onMarket={() => setMarketOffer(o)} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button onClick={() => fetchOffers(page + 1)} disabled={loading}
                  className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {marketOffer && !editingOffer && (
          <G2GMarketModal offer={marketOffer} sellerId={g2gUser}
            g2gKey={g2gKey} g2gSecret={g2gSecret} g2gJwt={g2gJwt}
            onClose={() => setMarketOffer(null)}
            onEdit={() => { setEditingOffer(marketOffer); setMarketOffer(null); }} />
        )}
        {editingOffer && (
          <G2GEditModal offer={editingOffer} g2gKey={g2gKey} g2gSecret={g2gSecret} g2gUser={g2gUser}
            onClose={() => setEditingOffer(null)}
            onUpdate={() => { fetchOffers(1); setEditingOffer(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'eldorado' | 'gameflip' | 'zeusx' | 'g2g'>(() =>
    (localStorage.getItem('active_tab') as 'eldorado' | 'gameflip' | 'zeusx' | 'g2g') || 'eldorado'
  );
  const [token, setToken] = useState<string | null>(localStorage.getItem('eldorado_token'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, unread: 0, activeOffers: 0, totalPages: 0 });
  const [unitImageMap, setUnitImageMap] = useState<Map<string, string>>(new Map());
  const offersFetchAbort = useRef<AbortController | null>(null);

  // Filters and Pagination
  const [pageIndex, setPageIndex] = useState(1);
  const [gameId, setGameId] = useState<string>('268');
  const [category] = useState<string>('CustomItem');
  const [offerState, setOfferState] = useState<string>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketPriceMap, setMarketPriceMap] = useState<Map<string, number[]>>(new Map());
  const [selectedMarketOffer, setSelectedMarketOffer] = useState<OfferItem | null>(null);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);

  useEffect(() => {
    fetch(`${GTDCDN_BASE}/units.json`)
      .then(r => r.json())
      .then((units: { id: string; name: string }[]) => {
        const map = new Map<string, string>();
        for (const u of units) {
          map.set(u.name.toLowerCase(), `${GTDCDN_BASE}/images/${u.id}.png`);
        }
        setUnitImageMap(map);
      })
      .catch(() => {});
  }, []);

  const handleStockUpdate = async (offer: OfferItem, qty: number, fallbackImageUrl?: string | null) => {
    if (!token) return;
    try {
      const price = offer.pricePerUnitInUSD || offer.pricePerUnit;
      const imageObj = buildMainOfferImage(offer)
        ?? (fallbackImageUrl ? { smallImage: fallbackImageUrl, largeImage: fallbackImageUrl } : undefined);
      await axios.put(`/api/eldorado/offers/${offer.id}/details`, {
        quantity: qty,
        offerTitle: offer.offerTitle || offer.gameCategoryTitle,
        description: offer.description ?? '',
        gameId: offer.gameId,
        category: offer.category,
        currentPrice: price.amount,
        currentCurrency: price.currency,
        guaranteedDeliveryTime: offer.guaranteedDeliveryTime,
        mainOfferImage: imageObj,
        offerImages: offer.offerImages,
      }, { headers: { Authorization: token } });
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, quantity: qty } : o));
    } catch (err: any) {
      const status = err.response?.status;
      const d = err.response?.data;
      const msg = d?.error || d?.message || d?.title || (typeof d === 'string' ? d : null);
      setError(`Stock update failed (${status ?? 'error'}): ${msg || 'check server terminal for details'}`);
    }
  };

  const fetchMarketPriceMap = async (myOffers: OfferItem[]) => {
    if (myOffers.length === 0) return;
    const tempMap = new Map<string, number[]>();
    // Global dedup: each market offer ID counted once, regardless of which query found it
    const seenIds = new Set<string>();

    const addOffer = (raw: any) => {
      const id = raw.id as string | undefined;
      if (id) {
        if (seenIds.has(id)) return;
        seenIds.add(id);
      }
      // Only count Active listings — paused/closed offers aren't visible on Eldorado
      if (raw.offerState && raw.offerState !== 'Active') return;
      const price = raw.pricePerUnitInUSD?.amount ?? raw.pricePerUnit?.amount ?? 0;
      if (price <= 0) return;
      // Key by base item name (matches Eldorado's per-unit price comparison across all quantities)
      const key = (raw.gameCategoryTitle || raw.offerTitle || '').split(' | ')[0].trim().toLowerCase();
      if (!key) return;
      if (!tempMap.has(key)) tempMap.set(key, []);
      tempMap.get(key)!.push(price);
    };

    const seenQueries = new Set<string>();
    const queries: { gameId: string; query: string; category?: string }[] = [];
    for (const o of myOffers) {
      const query = (o.gameCategoryTitle || o.offerTitle || '').split(' | ')[0].trim();
      if (!query || !o.gameId) continue;
      const key = `${o.gameId}::${query.toLowerCase()}`;
      if (seenQueries.has(key)) continue;
      seenQueries.add(key);
      queries.push({ gameId: o.gameId, query, category: o.category || undefined });
    }

    await Promise.allSettled(queries.map(async ({ gameId, query, category }) => {
      for (const cat of [category, undefined]) {
        try {
          const params: any = { gameId, searchQuery: query, pageSize: 24 };
          if (cat) params.category = cat;
          const r = await axios.get('/api/eldorado/public-item-offers', { params });
          const results = r.data.results || [];
          if (results.length > 0) {
            results.forEach((x: any) => addOffer(x.offer || x));
            break;
          }
        } catch {}
      }
    }));

    const sortedMap = new Map<string, number[]>();
    for (const [key, prices] of tempMap) {
      sortedMap.set(key, prices.slice().sort((a, b) => a - b));
    }
    setMarketPriceMap(sortedMap);
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await axios.get<NotificationsResponse>('/api/eldorado/notifications', {
        headers: { Authorization: token },
        params: { pageSize: 20 }
      });
      setNotifications(response.data.results);
      
      const unreadCount = response.data.results.filter(item => {
        const status = item.customNotification ? item.customNotification.readStatus : item.notification?.notificationReadStatus;
        return status === 'IsUnread';
      }).length;
      
      setStats(prev => ({
        ...prev,
        total: response.data.recordCount,
        unread: unreadCount
      }));
    } catch (err: any) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const fetchOffers = async (silent = false) => {
    if (!token) return [];
    offersFetchAbort.current?.abort();
    const controller = new AbortController();
    offersFetchAbort.current = controller;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const myParams = {
        pageSize: 20,
        pageIndex: pageIndex,
        gameId: gameId || undefined,
        offerState: offerState === 'All' ? undefined : offerState,
        searchQuery: searchQuery || undefined,
      };
      const axiosCfg = { headers: { Authorization: token }, signal: controller.signal };

      let results: OfferItem[] = [];
      let totalPages = 0;
      let recordCount = 0;

      // 1. Item Management — returns full image data (mainOfferImage.smallImage)
      try {
        const r = await axios.get<any>('/api/eldorado/offers', { ...axiosCfg, params: myParams });
        if (r.data.results?.length > 0 || r.data.recordCount > 0) {
          results = r.data.results.map((o: any) => ({
            ...o,
            offerTitle: o.offerTitle || o.gameCategoryTitle || '',
          }));
          totalPages = r.data.totalPages;
          recordCount = r.data.recordCount;
        }
      } catch (e: any) {
        if (axios.isCancel(e)) throw e;
      }

      // 2. Flexible Offers fallback
      if (results.length === 0) {
        try {
          const r = await axios.get<any>('/api/eldorado/flexible-offers', { ...axiosCfg, params: myParams });
          if (r.data.results?.length > 0) {
            results = r.data.results.map((o: any) => ({
              ...o,
              offerTitle: o.offerTitle || o.gameCategoryTitle || '',
            }));
            totalPages = r.data.totalPages;
            recordCount = r.data.recordCount;
          }
        } catch (e: any) {
          if (axios.isCancel(e)) throw e;
        }
      }

      // 3. Private Predefined Offers fallback
      if (results.length === 0) {
        try {
          const r = await axios.get<any>('/api/eldorado/my-predefined-offers', { ...axiosCfg, params: myParams });
          if (r.data.results?.length > 0) {
            results = r.data.results.map((item: any) => {
              const o = item.offer || item;
              return { ...o, offerTitle: o.offerTitle || o.gameCategoryTitle || '' };
            });
            totalPages = r.data.totalPages;
            recordCount = r.data.recordCount;
          }
        } catch (e: any) {
          if (axios.isCancel(e)) throw e;
        }
      }

      setOffers(results);
      setStats(prev => ({
        ...prev,
        activeOffers: results.filter(o => o.offerState === 'Active').length,
        totalPages: totalPages,
        total: recordCount
      }));
      if (!silent) fetchMarketPriceMap(results);
      return results;
    } catch (err: any) {
      if (axios.isCancel(err)) return [];
      console.error('Fetch offers error:', err);
      if (!silent) setError(err.response?.data?.error || 'Failed to fetch offers.');
      if (err.response?.status === 401) handleLogout();
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshData = () => {
    Promise.all([fetchNotifications(), fetchOffers()]);
  };

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, pageIndex, gameId, offerState]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageIndex(1);
    fetchOffers();
  };

  const handleLogin = (newToken: string) => {
    localStorage.setItem('eldorado_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('eldorado_token');
    setToken(null);
    setNotifications([]);
  };

  const ALL_TABS = ['eldorado', 'gameflip', 'zeusx', 'g2g'] as const;
  const TAB_LABELS: Record<string, string> = { eldorado: 'Eldorado', gameflip: 'Gameflip', zeusx: 'ZeusX', g2g: 'G2G' };

  if (!token && activeTab === 'eldorado') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="flex justify-center pt-6 gap-2">
          {ALL_TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); localStorage.setItem('active_tab', t); }}
              className={cn("px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                activeTab === t ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800")}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  const tabBar = (
    <div className="flex justify-center pt-6 pb-0 gap-2 absolute top-0 left-1/2 -translate-x-1/2 z-50">
      {ALL_TABS.map(t => (
        <button key={t} onClick={() => { setActiveTab(t); localStorage.setItem('active_tab', t); }}
          className={cn("px-5 py-2 rounded-xl text-sm font-semibold transition-all",
            activeTab === t ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800")}>
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );

  if (activeTab === 'gameflip') {
    return (
      <div className="min-h-screen bg-zinc-950">
        {tabBar}
        <GameflipDashboard />
      </div>
    );
  }

  if (activeTab === 'zeusx') {
    return (
      <div className="min-h-screen bg-zinc-950">
        {tabBar}
        <ZeusXDashboard />
      </div>
    );
  }

  if (activeTab === 'g2g') {
    return (
      <div className="min-h-screen bg-zinc-950">
        {tabBar}
        <G2GDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-violet-500/30">
      {/* Sidebar / Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">Eldorado Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-zinc-400" />
            {stats.unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full border border-zinc-900" />
            )}
          </button>
          <button 
            onClick={refreshData}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5 text-zinc-400", loading && "animate-spin")} />
          </button>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
            {ALL_TABS.map(t => (
              <button key={t} onClick={() => { setActiveTab(t); localStorage.setItem('active_tab', t); }}
                className={cn("px-3 py-1.5 text-xs font-semibold transition-all",
                  activeTab === t ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white")}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <Bell className="w-5 h-5 text-violet-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notifications</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total recorded events</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Offers</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.activeOffers}</div>
            <div className="text-xs text-zinc-500 mt-1">Active listings</div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status:</label>
            <select
              value={offerState}
              onChange={(e) => { setOfferState(e.target.value); setPageIndex(1); }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-zinc-300 min-w-[120px]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800 mx-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setGameId('268'); setPageIndex(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                gameId === '268'
                  ? "bg-violet-500/10 border-violet-500/50 text-violet-500"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              )}
            >
              GTD (268)
            </button>
            <button
              onClick={() => { setGameId(''); setPageIndex(1); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
            >
              All Games
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offers..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/20">
            Search
          </button>
        </form>

        {/* List Content */}
        <div className="min-h-[400px]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm mb-6">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {loading && offers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl aspect-[4/5] animate-pulse" />
              ))}
            </div>
          ) : (
            offers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                <AnimatePresence mode="popLayout">
                  {offers.map((offer) => {
                    const cdnImageUrl = lookupCdnImage(offer, unitImageMap);
                    return (
                      <div key={offer.id}>
                        <OfferCard
                          offer={offer}
                          cdnImageUrl={cdnImageUrl}
                          onClick={() => setSelectedMarketOffer(offer)}
                          onStockUpdate={
                            offer.offerState === 'Active' || offer.offerState === 'Paused'
                              ? (qty) => handleStockUpdate(offer, qty, cdnImageUrl)
                              : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : !loading && (
              <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
                <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <h3 className="text-zinc-400 font-bold text-lg">No offers found</h3>
                <p className="text-sm text-zinc-600 mt-1">Try adjusting your filters or search query</p>
              </div>
            )
          )}
        </div>

        {/* Pagination */}
        {stats.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setPageIndex(prev => Math.max(1, prev - 1))}
              disabled={pageIndex === 1 || loading}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-zinc-500 font-medium">
              Page <span className="text-zinc-200">{pageIndex}</span> of <span className="text-zinc-200">{stats.totalPages}</span>
            </span>
            <button
              onClick={() => setPageIndex(prev => Math.min(stats.totalPages, prev + 1))}
              disabled={pageIndex === stats.totalPages || loading}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {selectedMarketOffer && (
          <MarketPricesModal
            offer={selectedMarketOffer}
            onClose={() => setSelectedMarketOffer(null)}
            onEdit={setEditingOffer}
            unitImageMap={unitImageMap}
          />
        )}

        {editingOffer && token && (
          <EditPriceModal
            offer={editingOffer}
            token={token}
            onClose={() => setEditingOffer(null)}
            onUpdate={(silent?: boolean) => fetchOffers(silent)}
            cdnImageUrl={lookupCdnImage(editingOffer, unitImageMap)}
          />
        )}
      </main>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-[70] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-violet-500" />
                  <h2 className="text-lg font-bold text-white">Notifications</h2>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((item, idx) => (
                    <div key={idx}>
                      <NotificationCard item={item} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <Bell className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-500 text-sm">No new notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
