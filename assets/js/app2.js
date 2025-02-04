// Firebase Konfigürasyonu - Kendi projenizle değiştirin
const firebaseConfig = {
    apiKey: "AIzaSyB3joT6XrAK-1iT5RhCxGlBE5W_oLgnfPQ",
    authDomain: "dreamcartcher-715f0.firebaseapp.com",
    projectId: "dreamcartcher-715f0",
    storageBucket: "dreamcartcher-715f0.firebasestorage.app",
    messagingSenderId: "171511718410",
    appId: "1:171511718410:web:7bedb274b1ceae731a75f3",
    measurementId: "G-RP055QD9TR"
  };
  
  // Firebase'i Başlat
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const database = firebase.database();
  
  // DOM Elementleri
  const reviewTableBody = document.querySelector("#reviewTable tbody");
  const toursTableBody = document.querySelector("#toursTable tbody");
  const logoutBtn = document.getElementById("logoutBtn");
  
  // Sayfa yüklendiğinde, admin giriş kontrolü ve verileri getirme
  document.addEventListener("DOMContentLoaded", () => {
    // Admin kontrolü
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("Admin paneline erişmek için giriş yapmalısınız!");
        window.location.href = "signIn.html";
      } else {
        fetchPendingReviews();
        fetchTours();
      }
    });
  });
  
  // Onay Bekleyen Yorumları Getir
  function fetchPendingReviews() {
    // Tüm turların ID'lerini alalım
    const toursRef = database.ref("tours");
    toursRef.once("value", async (snapshot) => {
      const toursData = snapshot.val();
      if (!toursData) return;
  
      // Her turId için /reviews/tourId altına bakıp approved=false olan yorumları listeleyelim
      for (let tourId of Object.keys(toursData)) {
        const reviewRef = database.ref(`reviews/${tourId}`);
        const revSnapshot = await reviewRef.once("value");
        const revData = revSnapshot.val();
        if (!revData) continue;
  
        Object.keys(revData).forEach((revKey) => {
          const review = revData[revKey];
          if (review.approved === false) {
            // Tabloya ekle
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${tourId}</td>
              <td>${review.reviewerName}</td>
              <td>${review.stars}</td>
              <td>${review.comment}</td>
              <td>
                <button class="admin-btn approve-btn" 
                  data-tour="${tourId}" data-key="${revKey}">Onayla</button>
                <button class="admin-btn delete-btn"
                  data-tour="${tourId}" data-key="${revKey}">Sil</button>
              </td>
            `;
            reviewTableBody.appendChild(row);
          }
        });
      }
    });
  }
  
  // Tüm Turları Getir ve Fiyat Yönetimi Tablosunu Doldur
  function fetchTours() {
    const toursRef = database.ref("tours");
    toursRef.on("value", (snapshot) => {
      const toursData = snapshot.val();
      toursTableBody.innerHTML = ''; // Mevcut tabloyu temizle
      if (toursData) {
        Object.keys(toursData).forEach((tourId) => {
          const tour = toursData[tourId];
          const priceDetails = tour.priceDetails || {};
          const priceDetailsKeys = Object.keys(priceDetails);
  
          // Fiyat Detaylarını HTML olarak oluştur
          let priceDetailsHTML = '';
          if (priceDetailsKeys.length > 0) {
            priceDetailsHTML = priceDetailsKeys.map(detailKey => {
              return `
                <div class="price-detail">
                  <label for="${tourId}-${detailKey}">${detailKey}:</label>
                  <input type="text" id="${tourId}-${detailKey}" 
                    data-tour="${tourId}" data-detail="${detailKey}" 
                    value="${priceDetails[detailKey]}" />
                </div>
              `;
            }).join('');
          } else {
            priceDetailsHTML = 'Yok';
          }
  
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${tourId}</td>
            <td>${tour.title || "N/A"}</td>
            <td>${tour.price !== undefined ? tour.price : "N/A"}</td>
            <td><input type="number" min="0" class="price-input" data-tour="${tourId}" value="${tour.price !== undefined ? tour.price : 0}"></td>
            <td>${priceDetailsHTML}</td>
            <td>
              <button class="admin-btn update-btn" data-tour="${tourId}">Güncelle</button>
            </td>
          `;
          toursTableBody.appendChild(row);
        });
      } else {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="6">Mevcut tur bulunmamaktadır.</td>`;
        toursTableBody.appendChild(row);
      }
    });
  }
  
  // Onay Bekleyen Yorumlara Tıklama Olayını Yönet
  reviewTableBody.addEventListener("click", async (e) => {
    if (e.target.classList.contains("approve-btn")) {
      const tourId = e.target.getAttribute("data-tour");
      const revKey = e.target.getAttribute("data-key");
      await approveReview(tourId, revKey);
      // Tablo satırını kaldır
      e.target.closest("tr").remove();
    } else if (e.target.classList.contains("delete-btn")) {
      const tourId = e.target.getAttribute("data-tour");
      const revKey = e.target.getAttribute("data-key");
      await deleteReview(tourId, revKey);
      e.target.closest("tr").remove();
    }
  });
  
  // Turlar Tablosuna Tıklama Olayını Yönet (Güncelleme)
  toursTableBody.addEventListener("click", async (e) => {
    if (e.target.classList.contains("update-btn")) {
      const tourId = e.target.getAttribute("data-tour");
      const priceInput = document.querySelector(`input.price-input[data-tour="${tourId}"]`);
      const newPrice = parseFloat(priceInput.value);
      if (isNaN(newPrice) || newPrice < 0) {
        alert("Lütfen geçerli bir fiyat giriniz.");
        return;
      }
  
      // Fiyat Detaylarını Al
      const priceDetailInputs = document.querySelectorAll(`input[data-tour="${tourId}"][data-detail]`);
      let newPriceDetails = {};
      priceDetailInputs.forEach(input => {
        const detailKey = input.getAttribute("data-detail");
        const detailValue = input.value.trim();
        if (detailValue === "") {
          alert(`Lütfen ${detailKey} için geçerli bir fiyat giriniz.`);
          throw new Error(`Eksik fiyat: ${detailKey}`);
        }
        newPriceDetails[detailKey] = detailValue;
      });
  
      await updateTourPrice(tourId, newPrice, newPriceDetails);
    }
  });
  
  // Çıkış butonu
  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "signIn.html";
  });
  
  // Onaylama Fonksiyonu
  async function approveReview(tourId, reviewKey) {
    // /reviews/tourId/reviewKey => approved: true yap
    const refPath = `reviews/${tourId}/${reviewKey}`;
    await database.ref(refPath).update({ approved: true });
    alert("Yorum onaylandı!");
    // Puanı tekrar hesapla
    await recalcRating(tourId);
  }
  
  // Silme Fonksiyonu
  async function deleteReview(tourId, reviewKey) {
    const refPath = `reviews/${tourId}/${reviewKey}`;
    await database.ref(refPath).remove();
    alert("Yorum silindi!");
  }
  
  // Tur Fiyatını ve Fiyat Detaylarını Güncelleme Fonksiyonu
  async function updateTourPrice(tourId, newPrice, newPriceDetails) {
    const updates = {};
    updates[`tours/${tourId}/price`] = newPrice;
    updates[`tours/${tourId}/priceDetails`] = newPriceDetails;
  
    await database.ref().update(updates);
    alert("Fiyat ve fiyat detayları başarıyla güncellendi!");
  }
  
  // Puan Hesaplama Fonksiyonu
  async function recalcRating(tourId) {
    const reviewsRef = database.ref(`reviews/${tourId}`);
    const snapshot = await reviewsRef.once("value");
    const reviews = snapshot.val();
    if (!reviews) return;
  
    let totalStars = 0;
    let approvedCount = 0;
  
    Object.keys(reviews).forEach((revKey) => {
      const review = reviews[revKey];
      if (review.approved) {
        totalStars += review.stars;
        approvedCount += 1;
      }
    });
  
    const averageRating = approvedCount > 0 ? (totalStars / approvedCount).toFixed(2) : 0;
    await database.ref(`tours/${tourId}/rating`).set(averageRating);
    console.log(`Tur ID: ${tourId}, Yeni Ortalama Puan: ${averageRating}`);
  }
  