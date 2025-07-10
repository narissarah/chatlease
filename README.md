# ChatLease - AI-Powered Real Estate Platform for Montreal

An intelligent real estate platform that combines property listings with AI-powered assistance to help users find their perfect home in Montreal.

## 🚀 Features

- **AI-Powered Search**: Intelligent assistant that understands your needs and finds the perfect match
- **Multilingual Support**: Available in English, French, Spanish, Arabic, and Mandarin
- **Advanced Filtering**: 20+ filter options including proximity to metro, schools, and amenities
- **Financial Calculators**: Mortgage and affordability calculators with Quebec-specific tax calculations
- **Property Comparison**: Compare multiple properties side-by-side
- **Investment Analysis**: Cash flow projections, cap rates, and ROI calculations
- **Neighborhood Statistics**: Detailed area information with average prices and amenities
- **Centris Integration**: Full property data including municipal assessments, taxes, and condo fees

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: In-memory database with Centris data integration
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **AI Integration**: Custom AI chat system with financial expertise
- **Scraping**: Centris.ca property data scraper

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatlease.git
cd chatlease
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 🏗️ Project Structure

```
chatlease/
├── server/
│   ├── server.js              # Main server file
│   ├── config/
│   │   └── constants.js       # Server configuration
│   ├── database/
│   │   └── memory-db.js       # In-memory database
│   ├── scrapers/
│   │   └── centris-scraper.js # Centris data scraper
│   └── utils/
│       ├── cache.js           # Caching utility
│       └── response-builder.js # AI response patterns
├── client/
│   └── public/
│       ├── index.html         # Main HTML file
│       ├── css/
│       │   └── styles.css     # Custom styles
│       └── js/
│           ├── app.js         # Main application logic
│           └── config.js      # Client configuration
├── package.json
├── start-server.sh            # Server startup script
└── README.md
```

## 🔧 Configuration

### Server Configuration (`server/config/constants.js`)
- Cache settings
- Financial constants (GDS ratio, interest rates, down payments)
- Property filters (distance thresholds)
- Tax brackets and CMHC insurance rates

### Client Configuration (`client/public/js/config.js`)
- API endpoints
- UI settings
- Localization options
- Quick message templates

## 🌟 Key Features Explained

### AI Assistant
The AI assistant can help with:
- Property recommendations based on preferences
- Financial calculations and affordability assessments
- Neighborhood information and comparisons
- Investment analysis for rental properties
- First-time buyer guidance

### Property Search
- Filter by price, bedrooms, location, property type
- Advanced filters: near metro, pets allowed, parking, amenities
- Sort by price, size, date, or price per square foot

### Financial Tools
- **Mortgage Calculator**: Calculate monthly payments with Quebec land transfer tax
- **Affordability Calculator**: Determine maximum purchase price based on income
- **Investment Analysis**: Estimate rental income and calculate cap rates

## 📱 API Endpoints

- `GET /api/properties` - Get all properties with filtering
- `GET /api/properties/:id` - Get single property details
- `GET /api/neighborhoods` - Get neighborhood statistics
- `GET /api/price-ranges` - Get price ranges by area
- `POST /api/calculator/mortgage` - Calculate mortgage payments
- `POST /api/calculator/affordability` - Calculate affordability
- `POST /api/ai/chat` - AI chat endpoint

## 🚀 Deployment

The application is designed to be deployed on any Node.js hosting platform. Make sure to:

1. Set the `PORT` environment variable
2. Configure any necessary environment variables
3. Ensure Node.js version 14+ is installed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ in Montreal