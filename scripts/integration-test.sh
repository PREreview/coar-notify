#!/usr/bin/env bash
set -e

testcompose='docker compose -f scripts/integration-test-compose.yaml'

echo "Starting ..."
$testcompose up --detach

trap "echo 'Caught signal; killing application'; $testcompose logs; $testcompose down; exit 1" INT QUIT TERM
trap "echo 'Caught signal; killing application'; $testcompose logs; $testcompose down" EXIT

timeout --foreground 35 bash << EOT
  while true; do
    current=\$(docker inspect "scripts-app-1" | jq --raw-output '.[0].State.Health.Status')
    echo "app is in state: \${current}"
    if [ "\$current" == "healthy" ]; then
      break
    fi
    sleep 1
  done


  curl $($testcompose port app 3000)/inbox -X POST -d ' { "id": "10.1111/234567", "updated": "2023-08-09T17:01:32.340000", "@context": [ "https://www.w3.org/ns/activitystreams", "https://purl.org/coar/notify" ], "type": [ "Offer", "coar-notify:ReviewAction" ], "origin": { "id": "https://www.repo.org", "inbox": "https://api.repo.org/inbox", "type": "Service" }, "target": { "id": "https://www.review-service.org", "inbox": "https://api.review-service.org/inbox", "type": "Service" }, "object": { "id": "10.1101/234567", "ietf:cite-as": "https://doi.org/10.1101/2023.01.18.524616" }, "actor": { "id": "mailto:c.wilkinson@elifesciences.org", "type": "Person", "name": "Chris Wilkinson" } } '

  while true; do
    if $testcompose logs app | grep -q 'Job completed'; then
      echo "Job has completed"
      break
    fi
    sleep 1
  done
EOT
