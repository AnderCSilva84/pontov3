Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile((Join-Path $PWD 'src/assets/ta-no-ponto.png'))
$blue = [System.Drawing.ColorTranslator]::FromHtml('#082783')
function Save-Brand([string]$path,[int]$width,[int]$height,[string]$mode='full',[double]$ratio=1) {
 $bmp = [System.Drawing.Bitmap]::new($width,$height)
 $g = [System.Drawing.Graphics]::FromImage($bmp)
 $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.Clear($blue)
 if ($mode -in @('foreground','mono')) { $g.Clear([System.Drawing.Color]::Transparent) }
 $size = [int]([Math]::Min($width,$height)*$ratio)
 $dest = [System.Drawing.Rectangle]::new([int](($width-$size)/2),[int](($height-$size)/2),$size,$size)
 if ($mode -in @('clock','foreground','mono')) {
  if($mode -eq 'clock'){$clip=[System.Drawing.Drawing2D.GraphicsPath]::new();$clip.AddEllipse($dest);$g.SetClip($clip);$clip.Dispose()}
  $g.DrawImage($source,$dest,306,589,235,235,[System.Drawing.GraphicsUnit]::Pixel)
 } else { $g.DrawImage($source,$dest) }
 $g.Dispose()
 if ($mode -in @('foreground','mono')) {
  for($y=0;$y -lt $height;$y++){for($x=0;$x -lt $width;$x++){
   $c=$bmp.GetPixel($x,$y)
   if($c.A -eq 0){continue}
   $red=$c.R -gt 160 -and $c.G -lt 100 -and $c.B -lt 100
   $white=$c.R -gt 180 -and $c.G -gt 180 -and $c.B -gt 180
   if($mode -eq 'mono'){
    $radius=[Math]::Sqrt([Math]::Pow(($x-$width/2)/($size/2),2)+[Math]::Pow(($y-$height/2)/($size/2),2))
    if($white -or ($red -and $radius -gt .82)){$bmp.SetPixel($x,$y,[System.Drawing.Color]::White)}else{$bmp.SetPixel($x,$y,[System.Drawing.Color]::Transparent)}
   }elseif(-not ($red -or $white)){$bmp.SetPixel($x,$y,[System.Drawing.Color]::Transparent)}
  }}
 }
 $bmp.Save((Join-Path $PWD $path),[System.Drawing.Imaging.ImageFormat]::Png)
 $bmp.Dispose()
}
Save-Brand 'public/marca-ta-no-ponto.png' 512 512
foreach($n in @(192,512)){Save-Brand "public/icon-$n.png" $n $n; Save-Brand "public/icon-maskable-$n.png" $n $n 'full' .92}
Save-Brand 'public/apple-touch-icon.png' 180 180
Save-Brand 'public/favicon.png' 48 48 'clock' .82
foreach($pair in @(@('mdpi',48),@('hdpi',72),@('xhdpi',96),@('xxhdpi',144),@('xxxhdpi',192))){
 $dir="android/app/src/main/res/mipmap-$($pair[0])"; $n=[int]$pair[1]
 Save-Brand "$dir/ic_launcher.png" $n $n 'clock' .70
 Save-Brand "$dir/ic_launcher_round.png" $n $n 'clock' .70
 $adaptive=[int]($n*108/48)
 Save-Brand "$dir/ic_launcher_foreground.png" $adaptive $adaptive 'foreground' .50
 Save-Brand "$dir/ic_launcher_monochrome.png" $adaptive $adaptive 'mono' .50
}
foreach($f in Get-ChildItem 'android/app/src/main/res/drawable*/splash.png'){
 $old=[System.Drawing.Image]::FromFile($f.FullName);$w=$old.Width;$h=$old.Height;$old.Dispose()
 Save-Brand $f.FullName.Substring($PWD.Path.Length+1) $w $h 'full' .65
}
$source.Dispose()
