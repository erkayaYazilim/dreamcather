/* app.js */

// Firebase Config (KENDİ PROJE BİLGİLERİNİZİ EKLEYİN)
const firebaseConfig = {
    apiKey: "AIzaSyB3joT6XrAK-1iT5RhCxGlBE5W_oLgnfPQ",
    authDomain: "dreamcartcher-715f0.firebaseapp.com",
    projectId: "dreamcartcher-715f0",
    storageBucket: "dreamcartcher-715f0.firebasestorage.app",
    messagingSenderId: "171511718410",
    appId: "1:171511718410:web:7bedb274b1ceae731a75f3",
    measurementId: "G-RP055QD9TR"
  };
  /* app.js */

  // Firebase'i başlat
  firebase.initializeApp(firebaseConfig);
  
  // Realtime Database referansı
  const database = firebase.database();
  
  // Auth referansı
  const auth = firebase.auth();
  
  /**
   * Bir turun onaylanmış tüm yorumlarını okuyarak rating ve reviewCount değerini günceller.
   * turId: "balonTuru" gibi
   */
  async function recalcRating(tourId) {
    // 1) Tüm onaylanmış yorumları çek
    //    Realtime DB'de "reviews/tourId" altında "approved == true" olanları getiririz
    const reviewsRef = database.ref(`reviews/${tourId}`);
    let totalStars = 0;
    let count = 0;
  
    // "value" event'i ile, alt düğümlerin tamamını dinleyebiliriz
    // ama fonksiyon anlık çağrıldığında "once" kullanabiliriz
    const snapshot = await reviewsRef.once("value");
    snapshot.forEach((child) => {
      const rev = child.val();
      if (rev.approved === true) {
        totalStars += rev.stars;
        count++;
      }
    });
  
    let average = 0;
    if (count > 0) {
      average = totalStars / count;
    }
  
    // 2) tours/tourId altındaki rating ve reviewCount değerlerini güncelle
    const tourRef = database.ref(`tours/${tourId}`);
    await tourRef.update({
      rating: parseFloat(average.toFixed(1)), // Örnek: 4.3
      reviewCount: count
    });
  }
  