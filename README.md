# Inc Bekçi

ServiceNow liste görünümünü (senin ekran görüntündeki gibi) izler; sayfaya yeni
bir incident numarası düştüğünde sesli uyarı + masaüstü bildirimi verir.

## Nasıl çalışır
İki tespit mekanizması var, ikisi de periyodik DOM taramasıyla çalışır:

1. **Sayaç tespiti (asıl mekanizma)**: Listenin sağ üstündeki "28 total
   incidents" yazısını izler. Sayı artınca alarm çalar. Gruplu/kapalı liste
   görünümünde (State: Assigned (4) gibi katlanmış satırlar) INC numaraları
   DOM'da hiç bulunmadığı için asıl güvenilir mekanizma budur.
2. **INC regex tespiti (yedek)**: Sayfada görünen `INC\d{6,}` kalıbına uyan
   yeni numara yakalanırsa alarm çalar. Grupları açık tutuyorsan veya düz
   liste görünümü kullanıyorsan bu da çalışır.

Extension SADECE "Bu sayfayı izle" ile kaydettiğin host+path'te tarama ve
auto-refresh yapar. Ticket detay sayfalarında çalışmaz — hem ticket açınca
gelen yanlış alarmı, hem de ticket içinde yazarken auto-refresh'in sayfayı
yenileyip yazdıklarını kaybettirmesini engeller.

Ses, MV3 offscreen document üzerinden background'da çalınır — tarayıcının
autoplay kısıtına takılmaz, sekme arka planda olsa da duyulur. Bildirim OS
bildirimi olarak gelir ve tıklayana kadar ekranda kalır; tıklayınca SNOW
sekmesine götürür.

## Kurulum (unpacked / geliştirici modu)
1. Chrome/Edge → `chrome://extensions`
2. Sağ üstten **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle** → bu klasörü (`inc-bekci/`) seç.
4. Extension ikonuna tıkla → **Bu sayfayı izle** butonuna bas (RSNW - Incidents
   sayfası açıkken). Bu, host'u otomatik algılayıp izlemeyi başlatır.
5. İlk taramada mevcut 28 (veya kaç varsa) incident baseline olarak kaydedilir,
   sonrasında yeni gelenler için ses + bildirim alırsın.

## Ayarlar (options sayfası)
- **Hedef host**: hangi domain'de çalışacağı (popup'taki "Bu sayfayı izle"
  butonu bunu otomatik dolduruyor).
- **Regex**: varsayılan `INC\d{6,}`. Numara formatınız farklıysa (örn. başka
  prefix) burada değiştir.
- **Tarama aralığı**: varsayılan 15sn. Daha sık istersen düşür (min 3sn).
- **Sayfayı otomatik yenile**: SNOW liste görünümü kendiliğinden
  güncellenmediği için, açarsan sayfa belirttiğin dakika aralığıyla otomatik
  yenilenir (`location.reload()`). "Görüldü" listesi diske kaydedilip
  yenileme sonrası geri yüklendiği için, yenileme bildirim kaçırmaz.
- **Yenileme aralığı (dakika)**: min 1 dakika. Sayfada aktif olarak
  çalışıyorsan (filtre kutusuna yazı yazıyorsan vs.) yenileme seni böler,
  ona göre makul bir aralık seç (5-10 dk gibi).
- **Tüm "görüldü" kayıtlarını sıfırla**: baseline'ı unutturur, bir sonraki
  taramada mevcut tüm kayıtlar yeniden baseline'a alınır (yani sıfırlamadan
  hemen sonraki ilk tarama bildirim atmaz).

## Notlar / sınırlamalar
- Ses, tarayıcının otomatik oynatma politikasına tabi; sayfada en az bir kez
  kullanıcı etkileşimi olduysa (SNOW'da normal kullanımda hep olur) sorunsuz
  çalışır.
- Regex sayfadaki *tüm* metni tarıyor, yani filtrelenmiş liste görünümündeysen
  (senin ekran görüntündeki gibi `Assignment group = BT-NETWORK` filtresiyle)
  sadece o filtreye uyan kayıtlar zaten sayfada göründüğü için doğal olarak
  sadece onları yakalar.
- İkonlar programatik üretildi (kaktus yeşili + göz motifi), istersen
  `icon16/32/48/128.png` dosyalarını kendi tasarımınla değiştirebilirsin.
