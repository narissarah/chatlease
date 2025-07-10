Work on Centris scraping: $ARGUMENTS

## Legal Compliance First
- Check robots.txt and terms of service
- Implement rate limiting (max 1 request/second)
- Use rotating proxies to avoid IP blocking
- Respect server resources and peak hours

## Technical Requirements
- Handle dynamic content with Puppeteer/Playwright
- Parse property data including images, specs, agent info
- Implement error handling and retry logic
- Store data in PostgreSQL with proper indexing
- Real-time updates every 15 minutes

## Data Quality
- Validate all scraped data before storage
- Remove duplicates based on address + listing ID
- Handle property status changes (sold, withdrawn, etc.)
- Maintain data integrity and consistency

## Monitoring
- Log all scraping activities
- Monitor for blocking or rate limiting
- Alert on data quality issues
- Track scraping success rates