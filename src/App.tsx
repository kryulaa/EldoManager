import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Package, User, LogOut, RefreshCw, ChevronRight, Search, Filter, AlertCircle, CheckCircle2, Clock, X, Edit2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

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
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20">
            <Package className="w-8 h-8 text-orange-500" />
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all min-h-[120px] text-sm font-mono"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
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
    if (event === 'OrderCreated') return <Package className="w-5 h-5 text-orange-400" />;
    return <Bell className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50",
        isUnread && "border-l-4 border-l-orange-500"
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
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
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

const extractImage = (offer: any) => {
  return (
    offer.mainOfferImage?.smallImage ||
    offer.offerImages?.[0]?.smallImage ||
    offer.mainOfferImage?.largeImage ||
    null
  );
};

const OfferCard = ({ offer, onClick, onEdit, onPause, onResume, isUserOffer }: { offer: OfferItem, onClick?: () => void, onEdit?: () => void, onPause?: () => void, onResume?: () => void, isUserOffer?: boolean }) => {
  const getImageUrl = () => {
    const img = extractImage(offer);
    
    if (img) {
      if (img.startsWith('http')) return img;
      return `https://assetsdelivery.eldorado.gg/v7/${img}`;
    }
    
    // Fallback: imageLocation
    if (offer.imageLocation) {
      if (offer.imageLocation.startsWith('http')) return offer.imageLocation;
      return `https://assetsdelivery.eldorado.gg/v7/${offer.imageLocation}`;
    }
    
    // Fallback: mainOfferImage string
    if (typeof offer.mainOfferImage === 'string' && offer.mainOfferImage !== 'string') {
      if (offer.mainOfferImage.startsWith('http')) return offer.mainOfferImage;
      return `https://assetsdelivery.eldorado.gg/v7/${offer.mainOfferImage}`;
    }
    
    return null;
  };

  const imageUrl = getImageUrl();
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
      className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5 cursor-pointer flex flex-col"
      onClick={handleClick}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={offer.offerTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=No+Image';
            }}
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
            offer.offerState === 'Paused' ? "text-orange-400 bg-orange-500/20 border-orange-500/30" :
            "text-zinc-400 bg-zinc-500/20 border-zinc-500/30"
          )}>
            {offer.offerState}
          </span>
        </div>
        {isUserOffer && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500 text-white uppercase tracking-wider shadow-lg border border-orange-400">
              My Listing
            </span>
          </div>
        )}
      </div>
      
      <div className="p-2 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-orange-400 transition-colors leading-tight min-h-[1.75rem] flex-grow">
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
              <span className="text-xs font-black text-orange-500">
                ${displayPrice.amount.toFixed(2)} <span className="text-[9px] font-medium text-zinc-500">USD</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Stock</span>
              <div className="text-[10px] font-bold text-zinc-300">{offer.quantity}</div>
            </div>
          </div>
          
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[8px] text-zinc-500 font-bold">
              <div className="flex items-center gap-1 bg-zinc-800/50 px-1 py-0.5 rounded">
                <Clock className="w-2 h-2 text-orange-500/70" />
                {offer.orderCounts?.allTime ?? 0}
              </div>
              <div className="flex items-center gap-1 bg-zinc-800/50 px-1 py-0.5 rounded">
                <User className="w-2 h-2 text-blue-500/70" />
                {offer.pageViewCounts?.currentViewers ?? 0}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isUserOffer && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPause?.(); }}
                    className={cn(
                      "p-1 rounded-md transition-all",
                      offer.offerState === 'Active' 
                        ? "bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white" 
                        : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                    )}
                    title="Pause Offer"
                    disabled={offer.offerState !== 'Active'}
                  >
                    <Pause className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResume?.(); }}
                    className={cn(
                      "p-1 rounded-md transition-all",
                      offer.offerState === 'Paused' 
                        ? "bg-zinc-800 hover:bg-green-500 text-zinc-400 hover:text-white" 
                        : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                    )}
                    title="Resume Offer"
                    disabled={offer.offerState !== 'Paused'}
                  >
                    <Play className="w-2.5 h-2.5" />
                  </button>
                  
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="p-1 bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-md transition-all"
                      title="Edit Price"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EditPriceModal = ({ offer, token, onClose, onUpdate }: { 
  offer: OfferItem, 
  token: string, 
  onClose: () => void, 
  onUpdate: (silent?: boolean) => Promise<OfferItem[]> 
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
      // Try the new robust change-price endpoint first
      await axios.put(`/api/eldorado/offers/${offer.id}/change-price`, {
        amount: parseFloat(price),
        currency: "USD"
      }, {
        headers: { Authorization: token }
      });
      
      // Also try to update quantity if it changed - Using the simplified payload as requested
      if (parseInt(quantity) !== offer.quantity) {
        try {
          await axios.put(`/api/eldorado/offers/${offer.id}/details`, {
            quantity: parseInt(quantity)
          }, {
            headers: { Authorization: token }
          });
        } catch (qtyErr) {
          console.warn("Quantity update failed, but price might have succeeded", qtyErr);
        }
      }
      
      // Add a small delay to allow Eldorado backend to process the change
      // Poll for update to ensure UI reflects the change
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const results = await onUpdate(true); // Call fetchOffers(true)
        const updatedOffer = results?.find((o: any) => o.id === offer.id);
        
        if (updatedOffer) {
          console.log("POLLING ATTEMPT:", attempts, "PRICE:", updatedOffer.pricePerUnitInUSD?.amount || updatedOffer.pricePerUnit?.amount);
          setLocalOffer(updatedOffer);
          const currentPrice = updatedOffer.pricePerUnitInUSD?.amount || updatedOffer.pricePerUnit?.amount;
          if (currentPrice !== undefined) {
            setLivePrice(currentPrice);
          }
          
          if (currentPrice === parseFloat(price) || attempts >= 5) {
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
      setError(err.response?.data?.error || "Failed to update price");
      setLoading(false);
    }
  };

  const getModalImageUrl = () => {
    const img = extractImage(localOffer);
    
    if (img) {
      return img.startsWith('http') ? img : `https://assetsdelivery.eldorado.gg/v7/${img}`;
    }
    if (typeof localOffer.mainOfferImage === 'string') {
      return localOffer.mainOfferImage.startsWith('http') ? localOffer.mainOfferImage : `https://assetsdelivery.eldorado.gg/v7/${localOffer.mainOfferImage}`;
    }
    return '';
  };

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
               {offer.mainOfferImage || offer.offerImages?.[0] ? (
                 <img 
                   src={getModalImageUrl()} 
                   alt="" 
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
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
                  <span className="text-[10px] font-black text-orange-500 animate-pulse">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Quantity</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest text-xs"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MarketPricesModal = ({ offer, onClose, onPause, onResume, onEdit }: { 
  offer: OfferItem, 
  onClose: () => void,
  onPause: (id: string) => void,
  onResume: (id: string) => void,
  onEdit: (offer: OfferItem) => void
}) => {
  const [marketOffers, setMarketOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState<string>('Flexible');

  // Clean the search query by removing the game name suffix
  const cleanSearchQuery = (title: string) => {
    return title.split(' | ')[0].trim();
  };

  useEffect(() => {
    const fetchMarketPrices = async () => {
      setLoading(true);
      const query = cleanSearchQuery(offer.offerTitle || offer.gameCategoryTitle || '');
      
      try {
        // Try Flexible Offers first
        const flexibleResponse = await axios.get('/api/eldorado/public-flexible-offers', {
          params: {
            gameId: offer.gameId,
            category: offer.category,
            searchQuery: query,
            pageSize: 24
          }
        });

        if (flexibleResponse.data.results && flexibleResponse.data.results.length > 0) {
          const results = flexibleResponse.data.results.map((r: any) => ({
            ...(r.offer || r),
            offerTitle: (r.offer?.offerTitle || r.offer?.gameCategoryTitle) || (r.offerTitle || r.gameCategoryTitle),
            offerState: (r.offer?.offerState || r.offerState) || 'Active',
            sellerName: r.user?.username || r.seller?.username || 'Unknown'
          })).sort((a: any, b: any) => {
            const priceA = a.pricePerUnitInUSD?.amount || a.pricePerUnit?.amount || 0;
            const priceB = b.pricePerUnitInUSD?.amount || b.pricePerUnit?.amount || 0;
            return priceA - priceB;
          });
          setMarketOffers(results);
          setActiveEndpoint('Flexible');
        } else {
          // Fallback to Item Management Offers (Public Item Offers)
          const itemResponse = await axios.get('/api/eldorado/public-item-offers', {
            params: {
              gameId: offer.gameId,
              category: offer.category,
              searchQuery: query,
              pageSize: 24
            }
          });
          
          if (itemResponse.data.results && itemResponse.data.results.length > 0) {
            const results = itemResponse.data.results.map((r: any) => ({
              ...(r.offer || r),
              offerTitle: (r.offer?.offerTitle || r.offer?.gameCategoryTitle) || (r.offerTitle || r.gameCategoryTitle),
              offerState: (r.offer?.offerState || r.offerState) || 'Active',
              sellerName: r.user?.username || r.seller?.username || 'Unknown'
            })).sort((a: any, b: any) => {
              const priceA = a.pricePerUnitInUSD?.amount || a.pricePerUnit?.amount || 0;
              const priceB = b.pricePerUnitInUSD?.amount || b.pricePerUnit?.amount || 0;
              return priceA - priceB;
            });
            setMarketOffers(results);
            setActiveEndpoint('Item Management');
          } else {
            // Last fallback: Predefined Offers
            const predefinedResponse = await axios.get('/api/eldorado/predefined-offers', {
              params: {
                gameId: offer.gameId,
                category: offer.category,
                searchQuery: query,
                pageSize: 24
              }
            });
            if (predefinedResponse.data.results) {
              const results = predefinedResponse.data.results.map((r: any) => ({
                ...(r.offer || r),
                offerTitle: (r.offer?.offerTitle || r.offer?.gameCategoryTitle) || (r.offerTitle || r.gameCategoryTitle),
                offerState: (r.offer?.offerState || r.offerState) || 'Active',
                sellerName: r.user?.username || r.seller?.username || 'Unknown'
              })).sort((a: any, b: any) => {
                const priceA = a.pricePerUnitInUSD?.amount || a.pricePerUnit?.amount || 0;
                const priceB = b.pricePerUnitInUSD?.amount || b.pricePerUnit?.amount || 0;
                return priceA - priceB;
              });
              setMarketOffers(results);
              setActiveEndpoint('Predefined');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch market prices:', err);
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
                Comparing: <span className="text-orange-500">{offer.offerTitle}</span>
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
                    isUserOffer={mOffer.id === offer.id}
                    onPause={mOffer.id === offer.id ? () => onPause(mOffer.id) : undefined}
                    onResume={mOffer.id === offer.id ? () => onResume(mOffer.id) : undefined}
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

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('eldorado_token'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, unread: 0, activeOffers: 0, totalPages: 0 });
  
  // Filters and Pagination
  const [pageIndex, setPageIndex] = useState(1);
  const [gameId, setGameId] = useState<string>('268');
  const [category] = useState<string>('CustomItem');
  const [offerState, setOfferState] = useState<string>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'my' | 'market'>('my');
  const [selectedMarketOffer, setSelectedMarketOffer] = useState<OfferItem | null>(null);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);

  const handlePause = async (offerId: string) => {
    if (!token) return;
    try {
      await axios.post(`/api/eldorado/offers/${offerId}/pause`, {}, { headers: { Authorization: token } });
      
      // Poll for update to ensure UI reflects the change
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const results = await fetchOffers(true);
        const offer = results.find(o => o.id === offerId);
        if (offer?.offerState === 'Paused' || attempts >= 5) {
          fetchOffers(); // Final refresh to sync everything
        } else {
          setTimeout(poll, 1500);
        }
      };
      setTimeout(poll, 1500);
    } catch (err) {
      console.error("Failed to pause offer:", err);
    }
  };

  const handleResume = async (offerId: string) => {
    if (!token) return;
    try {
      await axios.post(`/api/eldorado/offers/${offerId}/resume`, {}, { headers: { Authorization: token } });
      
      // Poll for update to ensure UI reflects the change
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const results = await fetchOffers(true);
        const offer = results.find(o => o.id === offerId);
        if (offer?.offerState === 'Active' || attempts >= 5) {
          fetchOffers(); // Final refresh to sync everything
        } else {
          setTimeout(poll, 1500);
        }
      };
      setTimeout(poll, 1500);
    } catch (err) {
      console.error("Failed to resume offer:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
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
      setError(err.response?.data?.error || 'Failed to fetch notifications.');
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (silent = false) => {
    if (!token) return [];
    if (!silent) setLoading(true);
    setError(null);
    try {
      const endpoint = viewMode === 'market' ? '/api/eldorado/predefined-offers' : '/api/eldorado/flexible-offers';
      const response = await axios.get<any>(endpoint, {
        headers: { Authorization: token },
        params: { 
          pageSize: 20,
          pageIndex: pageIndex,
          gameId: gameId || undefined,
          category: category || undefined,
          offerState: offerState === 'All' ? undefined : offerState,
          searchQuery: searchQuery || undefined
        }
      });

      let results: OfferItem[] = [];
      let totalPages = 0;
      let recordCount = 0;

      if (viewMode === 'market') {
        results = response.data.results.map((r: any) => ({
          ...r.offer,
          offerTitle: r.offer.offerTitle || r.offer.gameCategoryTitle,
          offerState: r.offer.offerState || 'Active'
        }));
        totalPages = response.data.totalPages;
        recordCount = response.data.recordCount;
      } else {
        results = response.data.results;
        totalPages = response.data.totalPages;
        recordCount = response.data.recordCount;
      }

      setOffers(results);
      setStats(prev => ({ 
        ...prev, 
        activeOffers: results.filter(o => o.offerState === 'Active').length,
        totalPages: totalPages,
        total: recordCount
      }));
      return results;
    } catch (err: any) {
      console.error('Fetch offers error:', err);
      if (!silent) setError(err.response?.data?.error || 'Failed to fetch offers.');
      if (err.response?.status === 401) handleLogout();
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshData = () => {
    fetchNotifications();
    fetchOffers();
  };

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, pageIndex, gameId, offerState, viewMode]);

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

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-orange-500/30">
      {/* Sidebar / Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/50 backdrop-blur-xl border-b border-zinc-800 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-zinc-900" />
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notifications</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total recorded events</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unread</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.unread}</div>
            <div className="text-xs text-zinc-500 mt-1">Action required</div>
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

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button
                onClick={() => { setViewMode('my'); setPageIndex(1); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                  viewMode === 'my' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                My Offers
              </button>
              <button
                onClick={() => { setViewMode('market'); setPageIndex(1); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                  viewMode === 'market' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Market Prices
              </button>
            </div>

            <div className="h-6 w-[1px] bg-zinc-800 mx-2" />

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status:</label>
              <select 
                value={offerState}
                onChange={(e) => { setOfferState(e.target.value); setPageIndex(1); }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-zinc-300 min-w-[120px]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="h-6 w-[1px] bg-zinc-800 mx-2" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setGameId('268'); setPageIndex(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                  gameId === '268'
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
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
                  {offers.map((offer) => (
                    <div key={offer.id}>
                      <OfferCard 
                        offer={offer} 
                        onClick={viewMode === 'my' ? () => setSelectedMarketOffer(offer) : undefined}
                        onEdit={viewMode === 'my' ? () => setEditingOffer(offer) : undefined}
                        onPause={viewMode === 'my' ? () => handlePause(offer.id) : undefined}
                        onResume={viewMode === 'my' ? () => handleResume(offer.id) : undefined}
                      />
                    </div>
                  ))}
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
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-500 font-medium">
              Page <span className="text-zinc-200">{pageIndex}</span> of <span className="text-zinc-200">{stats.totalPages}</span>
            </span>
            <button
              onClick={() => setPageIndex(prev => Math.min(stats.totalPages, prev + 1))}
              disabled={pageIndex === stats.totalPages || loading}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        )}

        {selectedMarketOffer && (
          <MarketPricesModal 
            offer={selectedMarketOffer} 
            onClose={() => setSelectedMarketOffer(null)} 
            onPause={handlePause}
            onResume={handleResume}
            onEdit={setEditingOffer}
          />
        )}

        {editingOffer && token && (
          <EditPriceModal 
            offer={editingOffer} 
            token={token}
            onClose={() => setEditingOffer(null)}
            onUpdate={(silent?: boolean) => fetchOffers(silent)}
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
                  <Bell className="w-5 h-5 text-orange-500" />
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
