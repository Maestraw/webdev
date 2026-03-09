# download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64

# Change permission to executable 

chmod +x cloud-sql-proxy

# start the tunnel instance name structure PROJECT_ID:REGION:INSTANCE NAME
./cloud-sql-proxy --private-ip test-santa-thadeu-system:us-central1:santa-thadeu-system-db

# open new terminal and connect to connection 
psql "host=127.0.0.1 user=postgres dbname=postgres"