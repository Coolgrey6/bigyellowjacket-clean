import asyncio
import aiohttp
import json
import re
import ipaddress
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Set
from src.utils.logger import logger

class ThreatIntelligenceUpdater:
    """Service to periodically update threat intelligence from external sources"""
    
    def __init__(self, update_interval: int = 3600):
        self.update_interval = update_interval  # seconds
        self.running = False
        self.last_update = None
        
        # Threat intelligence sources
        self.threat_sources = {
            'emerging_threats': {
                'url': 'https://rules.emergingthreats.net/open/suricata/rules/compromised-ips.txt',
                'parser': self.parse_emerging_threats
            },
            'spamhaus_drop': {
                'url': 'https://www.spamhaus.org/drop/drop.txt',
                'parser': self.parse_spamhaus_drop
            },
            'abuse_ch': {
                'url': 'https://sslbl.abuse.ch/blacklist/sslblacklist.csv',
                'parser': self.parse_abuse_ch
            },
            'malwaredomainlist': {
                'url': 'https://www.malwaredomainlist.com/hostslist/ip.txt',
                'parser': self.parse_malwaredomainlist
            }
        }
        
        # Storage paths
        self.database_path = Path("data/threat_intel/database.json")
        self.backup_path = Path("data/threat_intel/database_backup.json")
        
    async def start_updater(self):
        """Start the threat intelligence updater"""
        self.running = True
        logger.info("Starting threat intelligence updater...")
        
        while self.running:
            try:
                await self.update_threat_intelligence()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error in threat intelligence updater: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
                
    def stop_updater(self):
        """Stop the threat intelligence updater"""
        self.running = False
        logger.info("Stopping threat intelligence updater...")
        
    async def update_threat_intelligence(self):
        """Update threat intelligence from all sources"""
        try:
            logger.info("Starting threat intelligence update...")
            
            # Load existing database
            existing_db = self.load_existing_database()
            
            # Create backup
            self.create_backup(existing_db)
            
            # Collect new intelligence
            new_malicious_ips = set()
            new_malicious_domains = set()
            update_stats = {}
            
            # Update from each source
            for source_name, source_config in self.threat_sources.items():
                try:
                    logger.info(f"Updating from {source_name}...")
                    
                    data = await self.fetch_from_source(source_config['url'])
                    if data:
                        parsed_data = source_config['parser'](data)
                        
                        ips = parsed_data.get('ips', set())
                        domains = parsed_data.get('domains', set())
                        
                        new_malicious_ips.update(ips)
                        new_malicious_domains.update(domains)
                        
                        update_stats[source_name] = {
                            'ips': len(ips),
                            'domains': len(domains),
                            'status': 'success'
                        }
                        
                        logger.info(f"Updated from {source_name}: {len(ips)} IPs, {len(domains)} domains")
                    else:
                        update_stats[source_name] = {'status': 'failed'}
                        
                except Exception as e:
                    logger.error(f"Error updating from {source_name}: {e}")
                    update_stats[source_name] = {'status': 'error', 'error': str(e)}
                    
            # Merge with existing data
            merged_db = self.merge_intelligence_data(
                existing_db, 
                new_malicious_ips, 
                new_malicious_domains
            )
            
            # Save updated database
            self.save_database(merged_db)
            
            # Update statistics
            self.last_update = datetime.now()
            
            logger.info(f"Threat intelligence update completed. "
                       f"Total IPs: {len(merged_db['malicious_ips'])}, "
                       f"Total domains: {len(merged_db.get('malicious_domains', []))}")
            
            # Log update statistics
            self.log_update_statistics(update_stats)
            
        except Exception as e:
            logger.error(f"Error in threat intelligence update: {e}")
            
    async def fetch_from_source(self, url: str) -> str:
        """Fetch data from a threat intelligence source"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, 
                    timeout=aiohttp.ClientTimeout(total=60),
                    headers={'User-Agent': 'BigYellowJacket-ThreatIntel/1.0'}
                ) as response:
                    if response.status == 200:
                        return await response.text()
                    else:
                        logger.warning(f"HTTP {response.status} from {url}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error fetching from {url}: {e}")
            return None
            
    def parse_emerging_threats(self, data: str) -> Dict:
        """Parse Emerging Threats compromised IPs"""
        ips = set()
        
        for line in data.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            # Extract IP addresses
            ip_matches = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', line)
            for ip in ip_matches:
                if self.is_valid_ip(ip):
                    ips.add(ip)
                    
        return {'ips': ips, 'domains': set()}
        
    def parse_spamhaus_drop(self, data: str) -> Dict:
        """Parse Spamhaus DROP list"""
        ips = set()
        
        for line in data.split('\n'):
            line = line.strip()
            if not line or line.startswith(';'):
                continue
                
            # CIDR notation
            parts = line.split(' ')
            if parts and '/' in parts[0]:
                try:
                    network = ipaddress.ip_network(parts[0], strict=False)
                    # Add the network address
                    ips.add(str(network.network_address))
                except ValueError:
                    continue
                    
        return {'ips': ips, 'domains': set()}
        
    def parse_abuse_ch(self, data: str) -> Dict:
        """Parse Abuse.ch SSL Blacklist"""
        ips = set()
        
        lines = data.split('\n')
        for line in lines[1:]:  # Skip header
            line = line.strip()
            if not line:
                continue
                
            parts = line.split(',')
            if len(parts) >= 3:
                ip = parts[2].strip('"')
                if self.is_valid_ip(ip):
                    ips.add(ip)
                    
        return {'ips': ips, 'domains': set()}
        
    def parse_malwaredomainlist(self, data: str) -> Dict:
        """Parse Malware Domain List IPs"""
        ips = set()
        
        for line in data.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            if self.is_valid_ip(line):
                ips.add(line)
                
        return {'ips': ips, 'domains': set()}
        
    def is_valid_ip(self, ip: str) -> bool:
        """Check if string is a valid IP address"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
            
    def load_existing_database(self) -> Dict:
        """Load existing threat intelligence database"""
        try:
            if self.database_path.exists():
                with open(self.database_path, 'r') as f:
                    return json.load(f)
            else:
                return self.create_empty_database()
                
        except Exception as e:
            logger.error(f"Error loading existing database: {e}")
            return self.create_empty_database()
            
    def create_empty_database(self) -> Dict:
        """Create empty threat intelligence database structure"""
        return {
            'malicious_ips': [],
            'malicious_domains': [],
            'threat_patterns': [],
            'risk_scores': {},
            'known_threats': {},
            'last_updated': None,
            'version': '1.0'
        }
        
    def create_backup(self, database: Dict):
        """Create backup of current database"""
        try:
            if self.database_path.exists():
                with open(self.backup_path, 'w') as f:
                    json.dump(database, f, indent=2)
                    
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            
    def merge_intelligence_data(self, existing_db: Dict, new_ips: Set[str], new_domains: Set[str]) -> Dict:
        """Merge new intelligence data with existing database"""
        try:
            # Convert existing lists to sets for efficient merging
            existing_ips = set(existing_db.get('malicious_ips', []))
            existing_domains = set(existing_db.get('malicious_domains', []))
            
            # Merge new data
            merged_ips = existing_ips.union(new_ips)
            merged_domains = existing_domains.union(new_domains)
            
            # Update database
            merged_db = dict(existing_db)
            merged_db['malicious_ips'] = list(merged_ips)
            merged_db['malicious_domains'] = list(merged_domains)
            merged_db['last_updated'] = datetime.now().isoformat()
            
            # Add metadata about update
            merged_db['update_stats'] = {
                'new_ips_added': len(new_ips - existing_ips),
                'new_domains_added': len(new_domains - existing_domains),
                'total_ips': len(merged_ips),
                'total_domains': len(merged_domains)
            }
            
            return merged_db
            
        except Exception as e:
            logger.error(f"Error merging intelligence data: {e}")
            return existing_db
            
    def save_database(self, database: Dict):
        """Save threat intelligence database to file"""
        try:
            # Ensure directory exists
            self.database_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.database_path, 'w') as f:
                json.dump(database, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving database: {e}")
            
    def log_update_statistics(self, stats: Dict):
        """Log update statistics"""
        try:
            stats_path = Path("data/threat_intel/update_stats.json")
            
            # Load existing stats
            if stats_path.exists():
                with open(stats_path, 'r') as f:
                    existing_stats = json.load(f)
            else:
                existing_stats = {'updates': []}
                
            # Add new stats
            update_record = {
                'timestamp': datetime.now().isoformat(),
                'sources': stats,
                'success_count': sum(1 for s in stats.values() if s.get('status') == 'success'),
                'error_count': sum(1 for s in stats.values() if s.get('status') == 'error')
            }
            
            existing_stats['updates'].append(update_record)
            
            # Keep only last 100 updates
            if len(existing_stats['updates']) > 100:
                existing_stats['updates'] = existing_stats['updates'][-100:]
                
            # Save stats
            with open(stats_path, 'w') as f:
                json.dump(existing_stats, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error logging update statistics: {e}")
            
    def get_update_status(self) -> Dict:
        """Get current update status"""
        return {
            'running': self.running,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'update_interval': self.update_interval,
            'next_update': (self.last_update + timedelta(seconds=self.update_interval)).isoformat() if self.last_update else None
        }
        
    async def force_update(self):
        """Force an immediate update"""
        logger.info("Forcing threat intelligence update...")
        await self.update_threat_intelligence() 