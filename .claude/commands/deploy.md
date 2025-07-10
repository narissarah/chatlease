Deploy ChatLease: $ARGUMENTS

## Pre-deployment Checklist
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Monitoring/logging setup
- [ ] Backup procedures verified

## Deployment Steps
1. **Database**: Run migrations in staging first
2. **Backend**: Deploy API with zero-downtime strategy
3. **Frontend**: Build and deploy React apps
4. **Mobile**: Upload to TestFlight/Play Console
5. **Monitoring**: Verify all systems operational
6. **Rollback Plan**: Document quick rollback procedures

## Post-deployment Validation
- API health checks passing
- Scraping pipeline operational
- Mobile apps functioning
- Performance within acceptable ranges
- Error rates below 1%

## Rollback Procedure
If critical issues detected:
1. Revert to previous stable version
2. Restore database if needed
3. Notify stakeholders
4. Document issues for future prevention