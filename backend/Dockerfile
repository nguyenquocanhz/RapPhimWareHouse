# ----------------------------------------------------------------- giai doan build
# Dung anh co san Maven de khoi phai tai lai qua wrapper trong moi lan build.
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Chep rieng pom truoc de tang phu thuoc duoc dung lai: sua ma nguon khong lam
# Docker tai lai toan bo thu vien.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --------------------------------------------------------------- giai doan chay
# Chi can JRE de chay, khong mang theo ca bo cong cu bien dich.
#
# Khong dung eclipse-temurin:17-jre-alpine duoc: ban Alpine cua Temurin chi co
# amd64, nen dung anh cho may ARM la hong ngay o buoc keo anh nen.
#
# Van giu nen Alpine thay vi doi sang ban Ubuntu da kien truc cua Temurin: Alpine
# co san busybox, tuc la con "addgroup -S" va "wget" cho HEALTHCHECK ben duoi.
# Doi sang Ubuntu thi ca hai deu phai viet lai, va anh con nang hon.
FROM bellsoft/liberica-openjre-alpine:17

WORKDIR /app

# ffmpeg: dung de bat mot khung hinh lam anh poster cho video trong kho rieng (ZCloud
# khong co san anh). Chi bat mot frame, co cache dia nen nhe - khac han pipeline dub.
RUN apk add --no-cache ffmpeg

# Chay bang tai khoan thuong, khong phai root.
RUN addgroup -S rapphim && adduser -S rapphim -G rapphim

# Tao san thu muc du lieu va giao cho user thuong. Phai lam truoc khi doi user:
# volume moi cua Docker thua quyen so huu tu thu muc nay trong anh, neu de root thi
# tien trinh chay bang user thuong khong ghi duoc - va loi chi lo ra luc chay.
RUN mkdir -p /app/data && chown -R rapphim:rapphim /app/data

USER rapphim

COPY --from=build --chown=rapphim:rapphim /build/target/*.jar app.jar

EXPOSE 8080

# Cho JVM biet han muc bo nho cua container thay vi doc cua ca may.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
