// CI/CD pipeline for the commitments Next.js app:
//   1. Build the image with Kaniko (no Docker daemon) and push to the in-cluster
//      registry, tagged with both the unique build number and :latest.
//   2. Update the deployment manifest in the infra repo to point at this build's
//      unique tag, and push that change. ArgoCD sees the manifest change and
//      auto-deploys the new image.

pipeline {
  agent {
    kubernetes {
      yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      command: ["sleep"]
      args: ["infinity"]
      tty: true
    - name: git
      image: alpine/git:2.45.2
      command: ["sleep"]
      args: ["infinity"]
      tty: true
'''
    }
  }

  environment {
    REGISTRY   = "192.168.1.245:5001"
    IMAGE      = "commitments"
    INFRA_REPO = "github.com/AmanHogan/k3s-data-platform.git"
    MANIFEST   = "manifests/commitments/deployment.yaml"
  }

  stages {
    stage('Build & Push image') {
      steps {
        container('kaniko') {
          sh '''
            /kaniko/executor \
              --context "$(pwd)" \
              --dockerfile Dockerfile \
              --destination ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} \
              --destination ${REGISTRY}/${IMAGE}:latest \
              --insecure --skip-tls-verify
          '''
        }
      }
    }

    stage('Update manifest & push (GitOps)') {
      steps {
        container('git') {
          withCredentials([usernamePassword(credentialsId: 'github-pat',
                                             usernameVariable: 'GIT_USER',
                                             passwordVariable: 'GIT_TOKEN')]) {
            sh '''
              git config --global user.email "jenkins@k3s.local"
              git config --global user.name "jenkins-ci"

              rm -rf infra
              git clone "https://${GIT_USER}:${GIT_TOKEN}@${INFRA_REPO}" infra
              cd infra

              sed -i "s#image: .*/${IMAGE}:.*#image: ${REGISTRY}/${IMAGE}:${BUILD_NUMBER}#" ${MANIFEST}

              git add ${MANIFEST}
              git commit -m "Deploy ${IMAGE}:${BUILD_NUMBER}" || { echo "No manifest change"; exit 0; }
              git push origin master
            '''
          }
        }
      }
    }
  }

  post {
    success {
      echo "Built ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} and updated the manifest. ArgoCD will deploy it."
    }
  }
}
