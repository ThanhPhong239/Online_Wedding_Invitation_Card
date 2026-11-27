
window.WEDDING_CONFIG = {
 
  couple: {
    groomName: "Ngọc Long",
    groomFullName: "Ngô Ngọc Long",
    brideName: "Thanh Loan",
    brideFullName: "Bùi Thị Thanh Loan",
    shortTitle: "Long & Loan",
    monogram: "L & L",
    crestSubtitle: "Wedding Invitation",
    heroKicker: "Trân Trọng Báo Tin Lễ Thành Hôn",
    weddingDayOfWeek: "CHỦ NHẬT",
    weddingDateDisplay: "24 . 01 . 2027",
    weddingDateCompact: "24.01.2027",
    weddingIso: "2027-01-24T13:00:00+07:00",
    rsvpDeadline: "10/10/2027",
    heroLocationTagline: "Cùng nhau viết tiếp chương hạnh phúc trọn vẹn nhất",
    heroBgImage: "/images/Ảnh1.jpg",
    heroFallbackImage: "/photo-placeholder.svg",
    inviteQuote:
      "“Tình yêu đẹp nhất không phải là điểm đến hoàn hảo, mà là hành trình ta chọn nắm tay nhau đi qua mọi mùa nắng mưa. Ngọc Long & Thanh Loan vô cùng hạnh phúc được đón tiếp Quý vị đến chung vui trong ngày trọng đại của hai gia đình.”",
    footerSub: "24 . 01 . 2027 — Forever Begins Here"
  },

  // 2. CẤU HÌNH NHẠC NỀN (HỖ TRỢ LINK YOUTUBE HOẶC FILE MP3 NỘI BỘ)
  music: {
    // Dán link YouTube (youtube.com/watch?v=..., youtu.be/..., shorts/...) hoặc ID video 11 ký tự.
    // Nếu để trống "", hệ thống sẽ tự động phát file MP3 bên dưới.
    youtubeUrl: "",
    src: "/music/asset.d99013564d0c.mp3",
    enableWebAudioFallback: true,
    melodyNotes: [
      523.25, 659.25, 783.99, 659.25,
      493.88, 587.33, 783.99, 587.33,
      440.00, 523.25, 659.25, 523.25,
      349.23, 440.00, 523.25, 440.00,
      392.00, 493.88, 587.33, 493.88,
      523.25, 659.25, 783.99, 1046.50
    ]
  },

  // 3. Ô 03 — CHUYỆN TÌNH YÊU (4 MỐC VỚI 4 HIỆU ỨNG XUẤT HIỆN RIÊNG BIỆT)
  timeline: [
    {
      date: "09 / 2022",
      title: "Lần Đầu Gặp Gỡ",
      text: "Một buổi chiều thu dịu mát với ánh nắng vàng nhẹ. Cái nhìn đầu tiên và cuộc trò chuyện tưởng chừng tình cờ ấy đã mở ra sợi dây duyên phận thật đẹp giữa hai tâm hồn.",
      side: "left",
      anim: 1
    },
    {
      date: "05 / 2023",
      title: "Chính Thức Hẹn Hò",
      text: "Sau những buổi dạo phố đầy ắp tiếng cười và sự đồng điệu, lời thương được ngỏ dưới ánh hoàng hôn rực rỡ. Từ ngày hôm ấy, cả hai bắt đầu viết chung từng trang thanh xuân.",
      side: "right",
      anim: 2,
      heartIcon: "♥"
    },
    {
      date: "02 / 2026",
      title: "Lời Cầu Hôn",
      text: "Giữa không gian ngập tràn nến ấm và hoa hồng trắng, chiếc nhẫn nhỏ được trao cùng lời hứa đồng hành trọn đời — và cái gật đầu rạng rỡ đã khép lại những tháng năm chờ đợi.",
      side: "left",
      anim: 3,
      shimmer: true
    },
    {
      date: "01 / 2027",
      title: "Chung Một Mái Nhà",
      text: "Ngày 24.01.2027 — chương đẹp nhất của tình yêu chính thức bắt đầu. Ngọc Long & Thanh Loan trân trọng đón Quý vị đến chung vui và chúc phúc cho tổ ấm mới.",
      side: "right",
      anim: 4,
      highlightTitle: true
    }
  ],

  // 4. Ô 04 — THÔNG TIN TIỆC CƯỚI & ĐỊA ĐIỂM (NHÀ TRAI & NHÀ GÁI)
  events: [
    {
      tag: "Tiệc Cưới Nhà Trai",
      name: "Lễ Thành Hôn",
      time: "09:00 • Chủ Nhật, 24.01.2027",
      venue: "Tư Gia Nhà Trai",
      address: "Trân trọng đón tiếp Quý khách tại Tư gia Nhà Trai",
      mapTitle: "Tiệc Cưới Nhà Trai — Lễ Thành Hôn",
      mapUrl: "https://maps.app.goo.gl/26vF78FVdENbwLaM6"
    },
    {
      tag: "Tiệc Cưới Nhà Gái",
      name: "Lễ Vu Quy",
      time: "10:00 • Chủ Nhật, 24.01.2027",
      venue: "Tư Gia Nhà Gái",
      address: "Trân trọng đón tiếp Quý khách tại Tư gia Nhà Gái",
      mapTitle: "Tiệc Cưới Nhà Gái — Lễ Vu Quy",
      mapUrl: "https://maps.google.com"
    }
  ],

  // 5. Ô 05 — ALBUM ẢNH CƯỚI KHUNG POLAROID
  gallery: [
    {
      src: "/images/DSC_1725.JPG",
      caption: "Khoảnh khắc nắm tay",
      rotStart: "-7deg",
      rotEnd: "-2deg",
      delay: "0.05s",
      fallbackTitle: "Nắm Tay Nhau",
      fallbackSubtitle: "LONG & LOAN",
      fallbackColors: ["#722F37", "#C5A880"]
    },
    {
      src: "/images/DSC_2128.JPG",
      caption: "Nắng chiều dịu êm",
      rotStart: "6deg",
      rotEnd: "1.6deg",
      delay: "0.14s",
      fallbackTitle: "Nắng Chiều Thu",
      fallbackSubtitle: "OUR STORY",
      fallbackColors: ["#5D4648", "#C5A880"]
    },
    {
      src: "/images/DSC_2137.JPG",
      caption: "Hoa trắng & lời hứa",
      rotStart: "-5deg",
      rotEnd: "-1.2deg",
      delay: "0.22s",
      fallbackTitle: "Lời Hứa Trăm Năm",
      fallbackSubtitle: "18.10.2027",
      fallbackColors: ["#3A4649", "#B9986E"]
    },
    {
      src: "/images/DSC_2153.JPG",
      caption: "Ánh mắt dịu dàng",
      rotStart: "7deg",
      rotEnd: "2.1deg",
      delay: "0.30s",
      fallbackTitle: "Ánh Mắt Dịu Dàng",
      fallbackSubtitle: "NGOC LONG & THANH LOAN",
      fallbackColors: ["#6B363D", "#D2B58F"]
    },
    {
      src: "/images/DSC_2219.JPG",
      caption: "Bước chung một lối",
      rotStart: "-6deg",
      rotEnd: "-1.8deg",
      delay: "0.38s",
      fallbackTitle: "Chung Một Lối",
      fallbackSubtitle: "FOREVER",
      fallbackColors: ["#473B3E", "#C5A880"]
    },
    {
      src: "/images/DSC_2329.JPG",
      caption: "Mãi bên nhau nhé",
      rotStart: "5deg",
      rotEnd: "1.4deg",
      delay: "0.46s",
      fallbackTitle: "Mãi Bên Nhau",
      fallbackSubtitle: "LOVE ALWAYS",
      fallbackColors: ["#722F37", "#8D6E52"]
    }
  ],

  // 6. Ô 06 — HỘP MỪNG CƯỚI QR (NHÀ TRAI & NHÀ GÁI)
  bankAccounts: [
    {
      side: "left",
      tag: "Mừng Cưới Nhà Trai",
      roleTitle: "Chú Rể Ngọc Long",
      bankName: "Ngân Hàng Techcombank",
      accountNumber: "19070791262010",
      accountDisplay: "1907 0791 2620 10",
      accountHolder: "NGO NGOC LONG",
      qrImageUrl: "/images/qr-chu-re.png",
      qrAccentCorner: "top-left",
      copySuccessMsg: "Đã sao chép STK chú rể Ngọc Long!"
    },
    {
      side: "right",
      tag: "Mừng Cưới Nhà Gái",
      roleTitle: "Cô Dâu Thanh Loan",
      bankName: "Ngân Hàng Techcombank",
      accountNumber: "0987654321",
      accountDisplay: "0987 6543 21",
      accountHolder: "BUI THI THANH LOAN",
      qrImageUrl: "", // Có thể điền link ảnh VietQR thật
      qrAccentCorner: "top-right",
      copySuccessMsg: "Đã sao chép STK cô dâu Thanh Loan!"
    }
  ],

  // 7. Ô 07 — KHÔNG DÙNG LỜI CHÚC MẪU
  defaultWishes: []
};
